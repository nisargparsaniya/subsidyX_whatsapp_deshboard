"""WhatsApp template builder and bulk marketing campaign launcher."""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact import HniContact
from app.models.template_campaign import (
    CAMPAIGN_RUNNING,
    LANGUAGES,
    TEMPLATE_CATEGORIES,
    BulkCampaign,
    WhatsAppTemplate,
)
from app.models.whatsapp_message import SENT, WhatsAppMessage
from app.services import whatsapp_engine
from app.services.security import get_current_user

router = APIRouter(prefix="/api", tags=["Templates & Campaigns"], dependencies=[Depends(get_current_user)])


class TemplatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    template_name: str = Field(min_length=2, max_length=160)
    category: str = "MARKETING"
    language: str = "en_IN"
    header_text: str = ""
    body_text: str = Field(min_length=1)
    footer_text: str = ""
    buttons_json: str = ""
    is_welcome_default: bool = False


class TemplateUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    template_name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = None
    language: str | None = None
    header_text: str | None = None
    body_text: str | None = Field(default=None, min_length=1)
    footer_text: str | None = None
    buttons_json: str | None = None
    is_welcome_default: bool | None = None


class CampaignLaunch(BaseModel):
    campaign_name: str = Field(min_length=2, max_length=160)
    template_id: int
    segment: str = "ALL"
    tag: str | None = Field(default=None, max_length=120)


def _get_template(db: Session, template_id: int) -> WhatsAppTemplate:
    template = db.get(WhatsAppTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WhatsApp template not found.")
    return template


def _buttons(template: WhatsAppTemplate) -> list:
    if not template.buttons_json:
        return []
    try:
        parsed = json.loads(template.buttons_json)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _validate_choice(value: str, options: tuple[str, ...], label: str) -> str:
    if value not in options:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label} '{value}'. Choose from: {', '.join(options)}.",
        )
    return value


def _clear_welcome_default(db: Session, keep_id: int | None = None) -> None:
    for template in db.scalars(select(WhatsAppTemplate).where(WhatsAppTemplate.is_welcome_default.is_(True))).all():
        if template.id != keep_id:
            template.is_welcome_default = False


# --------------------------------------------------------------------------- templates


@router.get("/templates")
def list_templates(
    category: str | None = None,
    language: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(WhatsAppTemplate)
    if category:
        query = query.where(WhatsAppTemplate.category == category)
    if language:
        query = query.where(WhatsAppTemplate.language == language)
    templates = list(db.scalars(query.order_by(WhatsAppTemplate.id)).all())
    return {"total": len(templates), "templates": [template.public() for template in templates]}


@router.post("/templates", status_code=status.HTTP_201_CREATED)
def create_template(payload: TemplatePayload, db: Session = Depends(get_db)):
    _validate_choice(payload.category, TEMPLATE_CATEGORIES, "category")
    _validate_choice(payload.language, LANGUAGES, "language")
    if payload.is_welcome_default:
        _clear_welcome_default(db)
    template = WhatsAppTemplate(is_mock=whatsapp_engine.mock_active(db), **payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"message": f"Template '{template.template_name}' created.", "template": template.public()}


@router.get("/templates/{template_id}")
def get_template(template_id: int, db: Session = Depends(get_db)):
    return {"template": _get_template(db, template_id).public()}


@router.get("/templates/{template_id}/preview")
def preview_template(template_id: int, contact_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    template = _get_template(db, template_id)
    contact = db.get(HniContact, contact_id) if contact_id else None
    if contact is None and contact_id is None:
        contact = db.scalar(select(HniContact).order_by(HniContact.id))
    return {
        "template_id": template.id,
        "contact_id": contact.id if contact else None,
        "header_text": whatsapp_engine.render(template.header_text, contact),
        "body_text": whatsapp_engine.render(template.body_text, contact),
        "footer_text": whatsapp_engine.render(template.footer_text, contact),
        "buttons": _buttons(template),
    }


@router.patch("/templates/{template_id}")
def update_template(template_id: int, payload: TemplateUpdate, db: Session = Depends(get_db)):
    template = _get_template(db, template_id)
    data = payload.model_dump(exclude_unset=True)
    if "category" in data and data["category"] is not None:
        _validate_choice(data["category"], TEMPLATE_CATEGORIES, "category")
    if "language" in data and data["language"] is not None:
        _validate_choice(data["language"], LANGUAGES, "language")
    if data.get("is_welcome_default"):
        _clear_welcome_default(db, keep_id=template.id)
    for key, value in data.items():
        if value is not None:
            setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return {"message": f"Template '{template.template_name}' updated.", "template": template.public()}


@router.post("/templates/{template_id}/set-welcome-default")
def set_welcome_default(template_id: int, db: Session = Depends(get_db)):
    template = _get_template(db, template_id)
    _clear_welcome_default(db, keep_id=template.id)
    template.is_welcome_default = True
    db.commit()
    db.refresh(template)
    return {"message": f"'{template.template_name}' now auto-sends to every new HNI contact.", "template": template.public()}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = _get_template(db, template_id)
    db.delete(template)
    db.commit()
    return {"message": f"Template '{template.template_name}' deleted."}


# --------------------------------------------------------------------------- campaigns


def _funnel(campaigns: list[BulkCampaign]) -> dict:
    return {
        "targeted": sum(campaign.total_targeted for campaign in campaigns),
        "sent": sum(campaign.sent_count for campaign in campaigns),
        "delivered": sum(campaign.delivered_count for campaign in campaigns),
        "read": sum(campaign.read_count for campaign in campaigns),
        "replied": sum(campaign.replied_count for campaign in campaigns),
    }


@router.get("/campaigns")
def list_campaigns(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):
    campaigns = list(db.scalars(select(BulkCampaign).order_by(BulkCampaign.id.desc()).limit(limit)).all())
    return {"total": len(campaigns), "campaigns": [campaign.public() for campaign in campaigns], "funnel": _funnel(campaigns)}


@router.post("/campaigns/launch", status_code=status.HTTP_201_CREATED)
def launch_campaign(payload: CampaignLaunch, user=Depends(get_current_user), db: Session = Depends(get_db)):
    template = _get_template(db, payload.template_id)
    segment = f"TAG:{payload.tag.strip()}" if payload.tag and payload.tag.strip() else (payload.segment or "ALL").strip()
    contacts = whatsapp_engine.contacts_for_segment(db, segment)
    if not contacts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No opted-in HNI contacts match the '{segment}' segment.",
        )

    is_mock = whatsapp_engine.mock_active(db)
    campaign = BulkCampaign(
        campaign_name=payload.campaign_name.strip(),
        segment=segment,
        template_id=template.id,
        template_name=template.template_name,
        total_targeted=len(contacts),
        status=CAMPAIGN_RUNNING,
        launched_by=user.username,
        is_mock=is_mock,
    )
    db.add(campaign)
    db.flush()
    for contact in contacts:
        whatsapp_engine.send_template(db, contact, template, campaign_id=campaign.id, status=SENT)
    db.commit()
    whatsapp_engine.refresh_campaign_counters(db, campaign)

    return {
        "message": f"Campaign launched to {len(contacts)} HNI contact(s) in the {segment} segment.",
        "campaign": campaign.public(),
        "sample_bubble": {
            "client_name": contacts[0].client_name,
            "body_text": whatsapp_engine.render(template.body_text, contacts[0]),
        },
    }


@router.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.get(BulkCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
    messages = list(
        db.scalars(
            select(WhatsAppMessage)
            .where(WhatsAppMessage.campaign_id == campaign.id)
            .order_by(WhatsAppMessage.id.desc())
            .limit(100)
        ).all()
    )
    contacts = {
        contact.id: contact
        for contact in db.scalars(
            select(HniContact).where(HniContact.id.in_({message.contact_id for message in messages}))
        ).all()
    }
    recipients = [
        {
            **message.public(),
            "client_name": contacts[message.contact_id].client_name if message.contact_id in contacts else "",
            "inquiry_id": contacts[message.contact_id].inquiry_id if message.contact_id in contacts else "",
        }
        for message in messages
    ]
    return {"campaign": campaign.public(), "recipients": recipients}


@router.post("/campaigns/{campaign_id}/advance-delivery")
def advance_delivery(campaign_id: int, db: Session = Depends(get_db)):
    """Demo hook simulating Meta delivery webhooks so the progress bar visibly climbs."""
    campaign = db.get(BulkCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
    whatsapp_engine.advance_campaign_delivery(db, campaign)
    return {"message": "Delivery receipts processed.", "campaign": campaign.public()}


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.get(BulkCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
    for message in db.scalars(select(WhatsAppMessage).where(WhatsAppMessage.campaign_id == campaign.id)).all():
        db.delete(message)
    db.delete(campaign)
    db.commit()
    return {"message": f"Campaign '{campaign.campaign_name}' deleted."}
