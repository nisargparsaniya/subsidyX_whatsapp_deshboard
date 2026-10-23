"""Live WhatsApp inbox, manual composer, Meta Cloud API webhook and MOCK -> LIVE cutover."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.contact import HniContact, next_inquiry_id
from app.models.system_setting import (
    LIVE,
    META_ACCESS_TOKEN,
    META_PHONE_NUMBER_ID,
    META_VERIFY_TOKEN,
    META_WABA_ID,
    MOCK,
    get_setting,
    get_whatsapp_mode,
    mask_secret,
    set_setting,
    set_whatsapp_mode,
)
from app.models.template_campaign import BulkCampaign, WhatsAppTemplate
from app.models.whatsapp_message import (
    DELIVERED,
    FAILED,
    INBOUND,
    READ,
    RECEIVED,
    SENT,
    WhatsAppMessage,
)
from app.services import contact_io, whatsapp_engine
from app.services.mock_seeder import purge_mock_data, seed_presentation_data
from app.services.security import get_current_user, require_admin

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

META_STATUS_MAP = {"sent": SENT, "delivered": DELIVERED, "read": READ, "failed": FAILED}


class MetaCredentials(BaseModel):
    meta_phone_number_id: str = Field(min_length=5, max_length=64)
    meta_waba_id: str = Field(min_length=5, max_length=64)
    meta_access_token: str = Field(min_length=20, max_length=1000)
    meta_verify_token: str | None = Field(default=None, max_length=120)


class SendPayload(BaseModel):
    contact_id: int
    body: str = Field(default="", max_length=4000)
    template_id: int | None = None


@router.get("/mode")
def mode(user=Depends(get_current_user), db: Session = Depends(get_db)):
    token = get_setting(db, META_ACCESS_TOKEN, "") or ""
    return {
        "whatsapp_mode": get_whatsapp_mode(db),
        "is_mock": whatsapp_engine.mock_active(db),
        "presentation_rows": whatsapp_engine.mock_counts(db),
        "meta": {
            "connected": bool(token),
            "phone_number_id": get_setting(db, META_PHONE_NUMBER_ID, "") or "",
            "waba_id": get_setting(db, META_WABA_ID, "") or "",
            "access_token": mask_secret(token),
            "verify_token": get_setting(db, META_VERIFY_TOKEN) or settings.META_VERIFY_TOKEN,
        },
    }


@router.post("/connect-meta-api")
def connect_meta_api(payload: MetaCredentials, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Purge every presentation row and switch the platform permanently to LIVE."""
    purged = purge_mock_data(db)
    set_setting(db, META_PHONE_NUMBER_ID, payload.meta_phone_number_id.strip(), admin.username)
    set_setting(db, META_WABA_ID, payload.meta_waba_id.strip(), admin.username)
    set_setting(db, META_ACCESS_TOKEN, payload.meta_access_token.strip(), admin.username)
    set_setting(db, META_VERIFY_TOKEN, (payload.meta_verify_token or settings.META_VERIFY_TOKEN).strip(), admin.username)
    set_whatsapp_mode(db, LIVE, admin.username)
    return {
        "message": (
            "Official Meta WhatsApp Cloud API connected. All presentation mock rows were purged — "
            "the command center is now 100% LIVE."
        ),
        "whatsapp_mode": LIVE,
        "purged": purged,
        "presentation_rows": whatsapp_engine.mock_counts(db),
    }


@router.post("/reset-demo-mock")
def reset_demo_mock(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Rehearsal switch: wipe any mock rows, flip back to MOCK and re-seed the 7:00 PM showcase."""
    purged = purge_mock_data(db)
    set_whatsapp_mode(db, MOCK, admin.username)
    seeded = seed_presentation_data(db, force=True)
    return {
        "message": "Presentation mode restored — Gujarat HNI contacts, templates, campaigns and chatbot threads re-seeded.",
        "whatsapp_mode": get_whatsapp_mode(db),
        "purged": purged,
        "seeded": seeded,
    }


@router.get("/threads")
def threads(db: Session = Depends(get_db)):
    contacts = list(db.scalars(select(HniContact).order_by(HniContact.id)).all())
    messages = list(db.scalars(select(WhatsAppMessage).order_by(WhatsAppMessage.id.desc())).all())

    latest: dict[int, WhatsAppMessage] = {}
    unread: dict[int, int] = {}
    for message in messages:
        latest.setdefault(message.contact_id, message)
        if message.direction == INBOUND and message.status == RECEIVED:
            unread[message.contact_id] = unread.get(message.contact_id, 0) + 1

    feed = [
        {
            "contact": contact.public(),
            "last_message": latest[contact.id].public() if contact.id in latest else None,
            "unread": unread.get(contact.id, 0),
        }
        for contact in contacts
    ]
    feed.sort(key=lambda item: item["last_message"]["created_at"] if item["last_message"] else "", reverse=True)
    return {
        "total": len(feed),
        "unread_total": sum(unread.values()),
        "threads": feed,
    }


@router.get("/messages/{contact_id}")
def conversation(
    contact_id: int,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    contact = db.get(HniContact, contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HNI contact not found.")
    messages = list(
        db.scalars(
            select(WhatsAppMessage)
            .where(WhatsAppMessage.contact_id == contact.id)
            .order_by(WhatsAppMessage.id.desc())
            .limit(limit)
        ).all()
    )
    return {"contact": contact.public(), "messages": [message.public() for message in reversed(messages)]}


@router.post("/threads/{contact_id}/read")
def mark_thread_read(contact_id: int, db: Session = Depends(get_db)):
    result = db.execute(
        update(WhatsAppMessage)
        .where(
            WhatsAppMessage.contact_id == contact_id,
            WhatsAppMessage.direction == INBOUND,
            WhatsAppMessage.status == RECEIVED,
        )
        .values(status=READ)
    )
    db.commit()
    return {"message": f"{result.rowcount or 0} inbound message(s) marked as read.", "marked": result.rowcount or 0}


@router.post("/send")
def send_message(payload: SendPayload, user=Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.get(HniContact, payload.contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HNI contact not found.")

    template = None
    if payload.template_id:
        template = db.get(WhatsAppTemplate, payload.template_id)
        if template is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WhatsApp template not found.")
    elif not payload.body.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Type a message or pick a template first.")

    message = whatsapp_engine.manual_reply(db, contact, payload.body.strip(), template=template)
    return {"message": f"Message queued for {contact.client_name}.", "sent_by": user.username, "chat_message": message.public()}


# --------------------------------------------------------------------------- Meta webhook


@router.get("/webhook", response_class=PlainTextResponse)
def verify_webhook(request: Request, db: Session = Depends(get_db)):
    params = request.query_params
    expected = get_setting(db, META_VERIFY_TOKEN) or settings.META_VERIFY_TOKEN
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == expected:
        return params.get("hub.challenge", "ok")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Webhook verification failed.")


def _inbound_text(message: dict) -> str:
    if message.get("text"):
        return str(message["text"].get("body", ""))
    button = message.get("button") or {}
    if button:
        return str(button.get("payload") or button.get("text") or "")
    interactive = (message.get("interactive") or {}).get("button_reply") or {}
    if interactive:
        return str(interactive.get("id") or interactive.get("title") or "")
    return ""


@router.post("/webhook")
async def receive_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    handled = 0
    replies = 0

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})

            for receipt in value.get("statuses", []):
                wa_id = receipt.get("id")
                new_status = META_STATUS_MAP.get(str(receipt.get("status", "")).lower())
                if not wa_id or new_status is None:
                    continue
                message = db.scalar(select(WhatsAppMessage).where(WhatsAppMessage.wa_message_id == wa_id))
                if message is None:
                    continue
                message.status = new_status
                db.commit()
                if message.campaign_id:
                    campaign = db.get(BulkCampaign, message.campaign_id)
                    if campaign is not None:
                        whatsapp_engine.refresh_campaign_counters(db, campaign)

            for inbound in value.get("messages", []):
                phone = contact_io.normalize_phone(inbound.get("from"))
                text = _inbound_text(inbound).strip()
                if phone is None or not text:
                    continue
                contact = db.scalar(select(HniContact).where(HniContact.whatsapp_number == phone))
                if contact is None:
                    name = (value.get("contacts") or [{}])[0].get("profile", {}).get("name") or "Walk-in WhatsApp Lead"
                    contact = contact_io.build_contact(
                        {"client_name": name, "whatsapp_number": phone},
                        is_mock=whatsapp_engine.mock_active(db),
                    )
                    contact.inquiry_id = next_inquiry_id(db)
                    contact.add_tags("New Inbound Lead")
                    db.add(contact)
                    db.commit()
                    db.refresh(contact)
                result = whatsapp_engine.handle_inbound(db, contact, text)
                handled += 1
                replies += 1 if result["reply"] else 0

    return {"status": "ok", "messages_handled": handled, "bot_replies": replies}
