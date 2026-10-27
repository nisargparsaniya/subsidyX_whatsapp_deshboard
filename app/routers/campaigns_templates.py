"""WhatsApp template builder, audience-targeted marketing and scheduled bulk campaigns."""

from datetime import datetime
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session


def parse_iso_datetime(val_str: str) -> datetime:
    """Parse ISO datetime using standard library without external dependencies."""
    val = val_str.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(val)
    if dt.tzinfo is not None:
        dt = dt.astimezone().replace(tzinfo=None)
    return dt

from app.database import get_db
from app.models.audit_log import ist_now
from app.models.contact import HniContact
from app.models.template_campaign import (
    CAMPAIGN_CANCELLED,
    CAMPAIGN_COMPLETED,
    CAMPAIGN_DRAFT,
    CAMPAIGN_PAUSED,
    CAMPAIGN_RUNNING,
    CAMPAIGN_SCHEDULED,
    LANGUAGES,
    SCHEDULE_IMMEDIATE,
    SCHEDULE_SCHEDULED,
    TEMPLATE_CATEGORIES,
    BulkCampaign,
    WhatsAppTemplate,
)
from app.models.whatsapp_message import SENT, WhatsAppMessage
from app.services import whatsapp_engine
from app.services.cache import invalidate_cache_prefix
from app.services.campaign_scheduler import execute_campaign, get_contacts_for_campaign
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
    campaign_category: str = Field(default="SUBSIDY_SCHEME_LAUNCH")
    target_list_ids: list[int] = Field(default_factory=list)
    segment: str = "ALL"
    tag: str | None = Field(default=None, max_length=120)
    schedule_type: str = Field(default=SCHEDULE_IMMEDIATE)
    scheduled_at_ist: str | None = Field(default=None)


class CampaignScheduleUpdate(BaseModel):
    scheduled_at_ist: str = Field(min_length=10)


class CampaignStatusUpdate(BaseModel):
    status: str = Field(min_length=3, max_length=30)


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
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = select(WhatsAppTemplate)
    if category:
        query = query.where(WhatsAppTemplate.category == category)
    if language:
        query = query.where(WhatsAppTemplate.language == language)
    all_templates = list(db.scalars(query.order_by(WhatsAppTemplate.id)).all())
    total = len(all_templates)
    start = (page - 1) * page_size
    paged = all_templates[start : start + page_size]
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "templates": [template.public() for template in paged],
    }


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
    invalidate_cache_prefix("templates")
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
    invalidate_cache_prefix("templates")
    return {"message": f"Template '{template.template_name}' updated.", "template": template.public()}


@router.post("/templates/{template_id}/set-welcome-default")
def set_welcome_default(template_id: int, db: Session = Depends(get_db)):
    template = _get_template(db, template_id)
    _clear_welcome_default(db, keep_id=template.id)
    template.is_welcome_default = True
    db.commit()
    db.refresh(template)
    invalidate_cache_prefix("templates")
    return {"message": f"'{template.template_name}' now auto-sends to every new HNI contact.", "template": template.public()}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = _get_template(db, template_id)
    db.delete(template)
    db.commit()
    invalidate_cache_prefix("templates")
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
def list_campaigns(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    all_campaigns = list(db.scalars(select(BulkCampaign).order_by(BulkCampaign.id.desc())).all())
    total = len(all_campaigns)
    start = (page - 1) * page_size
    paged = all_campaigns[start : start + page_size]
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "campaigns": [campaign.public() for campaign in paged],
        "funnel": _funnel(all_campaigns),
    }


@router.post("/campaigns/launch", status_code=status.HTTP_201_CREATED)
def launch_campaign(payload: CampaignLaunch, user=Depends(get_current_user), db: Session = Depends(get_db)):
    template = _get_template(db, payload.template_id)
    segment = f"TAG:{payload.tag.strip()}" if payload.tag and payload.tag.strip() else (payload.segment or "ALL").strip()
    
    contacts = get_contacts_for_campaign(db, payload.target_list_ids, segment)
    if not contacts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No opted-in HNI contacts match the chosen Client Lists and segment.",
        )

    is_mock = whatsapp_engine.mock_active(db)
    is_scheduled = payload.schedule_type.strip().upper() == SCHEDULE_SCHEDULED

    scheduled_dt = None
    if is_scheduled:
        if not payload.scheduled_at_ist:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Schedule date and time (IST) is required for scheduled campaigns.")
        try:
            scheduled_dt = parse_iso_datetime(payload.scheduled_at_ist)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid date format: {e}")

    campaign = BulkCampaign(
        campaign_name=payload.campaign_name.strip(),
        campaign_category=payload.campaign_category.strip(),
        segment=segment,
        target_list_ids_json=json.dumps(payload.target_list_ids or []),
        template_id=template.id,
        template_name=template.template_name,
        total_targeted=len(contacts),
        schedule_type=SCHEDULE_SCHEDULED if is_scheduled else SCHEDULE_IMMEDIATE,
        scheduled_at_ist=scheduled_dt,
        status=CAMPAIGN_SCHEDULED if is_scheduled else CAMPAIGN_RUNNING,
        launched_by=user.username,
        is_mock=is_mock,
        created_at=ist_now(),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    invalidate_cache_prefix("campaigns")

    if is_scheduled:
        time_str = scheduled_dt.strftime("%d %b %Y, %I:%M %p IST")
        return {
            "message": f"Campaign scheduled for {time_str} ({len(contacts)} contacts targeted).",
            "campaign": campaign.public(),
            "scheduled": True,
        }

    # Immediate execution
    execute_campaign(db, campaign)
    return {
        "message": f"Campaign launched immediately to {len(contacts)} HNI contact(s).",
        "campaign": campaign.public(),
        "sample_bubble": {
            "client_name": contacts[0].client_name,
            "body_text": whatsapp_engine.render(template.body_text, contacts[0]),
        },
    }


@router.post("/campaigns/{campaign_id}/execute-now")
def execute_campaign_now(campaign_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    campaign = db.get(BulkCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
    
    count = execute_campaign(db, campaign)
    invalidate_cache_prefix("campaigns")
    return {
        "message": f"Campaign '{campaign.campaign_name}' executed to {count} contact(s).",
        "campaign": campaign.public(),
    }


@router.patch("/campaigns/{campaign_id}/schedule")
def reschedule_campaign(campaign_id: int, payload: CampaignScheduleUpdate, db: Session = Depends(get_db)):
    campaign = db.get(BulkCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
    
    try:
        new_dt = parse_iso_datetime(payload.scheduled_at_ist)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid date format: {e}")

    campaign.scheduled_at_ist = new_dt
    campaign.schedule_type = SCHEDULE_SCHEDULED
    campaign.status = CAMPAIGN_SCHEDULED
    db.commit()
    db.refresh(campaign)
    invalidate_cache_prefix("campaigns")

    time_str = new_dt.strftime("%d %b %Y, %I:%M %p IST")
    return {
        "message": f"Campaign '{campaign.campaign_name}' rescheduled to {time_str}.",
        "campaign": campaign.public(),
    }


@router.patch("/campaigns/{campaign_id}/status")
def update_campaign_status(campaign_id: int, payload: CampaignStatusUpdate, db: Session = Depends(get_db)):
    campaign = db.get(BulkCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
    
    valid_statuses = {CAMPAIGN_SCHEDULED, CAMPAIGN_PAUSED, CAMPAIGN_CANCELLED, CAMPAIGN_DRAFT}
    st = payload.status.strip().upper()
    if st not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status '{st}'. Choose from: {', '.join(valid_statuses)}")

    campaign.status = st
    db.commit()
    db.refresh(campaign)
    invalidate_cache_prefix("campaigns")

    return {
        "message": f"Campaign status updated to {st}.",
        "campaign": campaign.public(),
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
