"""Omnichannel Lead Capture, Integrations (Instagram, Facebook, Google Forms) & Unified CRM."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def parse_iso_datetime(val_str: str | None) -> datetime | None:
    if not val_str:
        return None
    val = val_str.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(val)
    if dt.tzinfo is not None:
        dt = dt.astimezone().replace(tzinfo=None)
    return dt

from app.database import get_db
from app.models.audit_log import ist_now
from app.models.client_list import ClientList
from app.models.leads_integration import (
    LEAD_PRIORITIES,
    LEAD_STAGES,
    PLATFORMS,
    IntegrationChannel,
    OmniLead,
    SocialCampaignPost,
)
from app.models.user import User
from app.services.lead_service import (
    assign_advisor_round_robin,
    convert_lead_to_contact,
    next_lead_code,
    next_post_code,
    normalize_indian_phone,
)
from app.services.security import get_current_user, require_admin

router = APIRouter(prefix="/api", tags=["Leads & Integrations"])


# --------------------------------------------------------------------------- Schemas


class ChannelUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    display_name: str | None = None
    account_or_form_id: str | None = None
    webhook_verify_token: str | None = None
    default_list_id: int | None = None
    auto_send_welcome: bool | None = None
    is_connected: bool | None = None


class PostCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    platform: str = Field(default="INSTAGRAM")
    title: str = Field(min_length=2, max_length=150)
    content_caption: str = Field(default="")
    target_sector: str = Field(default="")
    landing_or_form_url: str = Field(default="")
    status: str = Field(default="PUBLISHED")
    scheduled_at_ist: str | None = None


class LeadCreatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    full_name: str = Field(min_length=2, max_length=120)
    company_name: str = Field(default="", max_length=150)
    phone_number: str = Field(min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    source_platform: str = Field(default="MANUAL_ENTRY")
    campaign_name: str = Field(default="", max_length=150)
    state: str = Field(default="Gujarat")
    district: str = Field(default="")
    sector: str = Field(default="")
    estimated_investment_lakhs: float = Field(default=0.0)
    estimated_subsidy_lakhs: float = Field(default=0.0)
    priority: str = Field(default="HIGH")
    assigned_to_username: str | None = None
    target_list_id: int | None = None
    notes: str | None = None


class LeadUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    company_name: str | None = Field(default=None, max_length=150)
    phone_number: str | None = Field(default=None, min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    district: str | None = None
    sector: str | None = None
    estimated_investment_lakhs: float | None = None
    estimated_subsidy_lakhs: float | None = None
    priority: str | None = None
    assigned_to_username: str | None = None
    target_list_id: int | None = None
    notes: str | None = None


class LeadStageUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lead_stage: str = Field(min_length=2, max_length=40)


class LeadConvertPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    target_list_id: int | None = None


class WebhookLeadPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    full_name: str = Field(default="", max_length=120)
    phone_number: str = Field(default="", max_length=30)
    company_name: str | None = None
    email: str | None = None
    district: str | None = None
    sector: str | None = None
    estimated_investment_lakhs: float = 0.0
    estimated_subsidy_lakhs: float = 0.0
    campaign_name: str | None = None
    source_post_id: int | None = None
    notes: str | None = None

    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("full_name"):
                data["full_name"] = data.get("lead_name") or data.get("name") or "Inbound Lead"
            if not data.get("phone_number"):
                data["phone_number"] = data.get("mobile_number") or data.get("phone") or ""
        return data


# --------------------------------------------------------------------------- Channels


def _ensure_default_channels(db: Session) -> None:
    defaults = [
        ("INSTAGRAM", "SubsidyX Official Instagram Business", "subsidyx_in", "sx_ig_webhook_2026"),
        ("FACEBOOK", "SubsidyX Facebook Lead Ads", "act_subsidyx_ads_2026", "sx_fb_webhook_2026"),
        ("GOOGLE_FORMS", "Gujarat Industrial Subsidy Google Form", "form_gj_ind_2026", "sx_gf_webhook_2026"),
        ("WHATSAPP_DIRECT", "SubsidyX WhatsApp Inbound Helpline", "+919426015394", "subsidyx_meta_verify_2026"),
    ]
    for platform, name, account_id, token in defaults:
        ch = db.scalar(select(IntegrationChannel).where(IntegrationChannel.platform == platform))
        if ch is None:
            db.add(
                IntegrationChannel(
                    platform=platform,
                    display_name=name,
                    account_or_form_id=account_id,
                    webhook_verify_token=token,
                    is_connected=True,
                    auto_send_welcome=True,
                    total_leads_synced=0,
                )
            )
    db.commit()


@router.get("/integrations/channels", dependencies=[Depends(require_admin)])
def get_channels(db: Session = Depends(get_db)):
    _ensure_default_channels(db)
    channels = list(db.scalars(select(IntegrationChannel).order_by(IntegrationChannel.id.asc())).all())
    return {"channels": [ch.public() for ch in channels]}


@router.put("/integrations/channels/{platform}", dependencies=[Depends(require_admin)])
def update_channel(
    platform: str,
    payload: ChannelUpdate,
    db: Session = Depends(get_db),
):
    plat = platform.strip().upper()
    ch = db.scalar(select(IntegrationChannel).where(IntegrationChannel.platform == plat))
    if ch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Channel '{plat}' not found.")

    if payload.display_name is not None:
        ch.display_name = payload.display_name.strip()
    if payload.account_or_form_id is not None:
        ch.account_or_form_id = payload.account_or_form_id.strip()
    if payload.webhook_verify_token is not None:
        ch.webhook_verify_token = payload.webhook_verify_token.strip()
    if payload.default_list_id is not None:
        ch.default_list_id = payload.default_list_id
    if payload.auto_send_welcome is not None:
        ch.auto_send_welcome = payload.auto_send_welcome
    if payload.is_connected is not None:
        ch.is_connected = payload.is_connected

    db.commit()
    db.refresh(ch)
    return {"message": f"Channel '{plat}' settings updated.", "channel": ch.public()}


# --------------------------------------------------------------------------- Social Posts / Forms


@router.get("/integrations/posts", dependencies=[Depends(get_current_user)])
def list_posts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    platform: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(SocialCampaignPost)
    if platform and platform.strip():
        query = query.where(SocialCampaignPost.platform == platform.strip().upper())
    
    all_posts = list(db.scalars(query.order_by(SocialCampaignPost.id.desc())).all())
    total = len(all_posts)
    offset = (page - 1) * page_size
    paged = all_posts[offset : offset + page_size]
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "posts": [p.public() for p in paged],
    }


@router.post("/integrations/posts", status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
def create_post(
    payload: PostCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plat = payload.platform.strip().upper()
    sched_dt = None
    if payload.scheduled_at_ist:
        try:
            sched_dt = parse_iso_datetime(payload.scheduled_at_ist)
        except Exception:
            pass

    post = SocialCampaignPost(
        post_code=next_post_code(db),
        platform=plat,
        title=payload.title.strip(),
        content_caption=payload.content_caption.strip(),
        target_sector=payload.target_sector.strip(),
        landing_or_form_url=payload.landing_or_form_url.strip(),
        status=payload.status.strip().upper(),
        scheduled_at_ist=sched_dt,
        leads_captured_count=0,
        created_by=user.username,
        created_at=ist_now(),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"message": f"Post/Form registered under '{post.post_code}'.", "post": post.public()}


# --------------------------------------------------------------------------- Inbound Webhooks (No Auth Required)


def _ingest_webhook_lead(db: Session, platform: str, payload: WebhookLeadPayload) -> OmniLead:
    try:
        norm_phone = normalize_indian_phone(payload.phone_number, fallback_simulation=True)
    except Exception:
        norm_phone = "+919825001234"

    try:
        _ensure_default_channels(db)
        ch = db.scalar(select(IntegrationChannel).where(IntegrationChannel.platform == platform))
        advisor = assign_advisor_round_robin(db)

        lead = OmniLead(
            lead_code=next_lead_code(db),
            full_name=(payload.full_name or "Inbound Lead").strip(),
            company_name=(payload.company_name or "").strip(),
            phone_number=norm_phone,
            email=(payload.email or "").strip() or None,
            source_platform=platform,
            source_post_id=payload.source_post_id,
            campaign_name=(payload.campaign_name or "").strip(),
            state="Gujarat",
            district=(payload.district or "").strip(),
            sector=(payload.sector or "").strip(),
            estimated_investment_lakhs=float(payload.estimated_investment_lakhs or 0.0),
            estimated_subsidy_lakhs=float(payload.estimated_subsidy_lakhs or 0.0),
            lead_stage="NEW",
            priority="HIGH",
            assigned_to_username=advisor,
            target_list_id=ch.default_list_id if ch else None,
            notes=payload.notes,
            created_at_ist=ist_now(),
            updated_at_ist=ist_now(),
        )
        db.add(lead)

        # Increment stats on channel & post
        if ch:
            ch.total_leads_synced += 1
            ch.last_lead_at_ist = ist_now()
        if payload.source_post_id:
            post = db.get(SocialCampaignPost, payload.source_post_id)
            if post:
                post.leads_captured_count += 1

        db.commit()
        db.refresh(lead)
        return lead
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lead ingestion error: {str(e)}")


@router.post("/integrations/webhooks/instagram", status_code=status.HTTP_201_CREATED)
def webhook_instagram(payload: WebhookLeadPayload, db: Session = Depends(get_db)):
    lead = _ingest_webhook_lead(db, "INSTAGRAM", payload)
    return {"status": "ok", "message": "Lead ingested from Instagram Lead Ad.", "lead": lead.public()}


@router.post("/integrations/webhooks/facebook", status_code=status.HTTP_201_CREATED)
def webhook_facebook(payload: WebhookLeadPayload, db: Session = Depends(get_db)):
    lead = _ingest_webhook_lead(db, "FACEBOOK", payload)
    return {"status": "ok", "message": "Lead ingested from Facebook Lead Ad.", "lead": lead.public()}


@router.post("/integrations/webhooks/google-forms", status_code=status.HTTP_201_CREATED)
def webhook_google_forms(payload: WebhookLeadPayload, db: Session = Depends(get_db)):
    lead = _ingest_webhook_lead(db, "GOOGLE_FORMS", payload)
    return {"status": "ok", "message": "Lead ingested from Google Forms.", "lead": lead.public()}


# --------------------------------------------------------------------------- Unified Lead CRM (Auth Required)


@router.get("/leads", dependencies=[Depends(get_current_user)])
def list_leads(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    source_platform: str | None = Query(default=None),
    lead_stage: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(OmniLead)
    if source_platform and source_platform.strip():
        query = query.where(OmniLead.source_platform == source_platform.strip().upper())
    if lead_stage and lead_stage.strip():
        query = query.where(OmniLead.lead_stage == lead_stage.strip().upper())
    if priority and priority.strip():
        query = query.where(OmniLead.priority == priority.strip().upper())
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.where(
            func.lower(OmniLead.full_name).like(term)
            | func.lower(OmniLead.company_name).like(term)
            | OmniLead.phone_number.like(term)
            | func.lower(OmniLead.lead_code).like(term)
            | func.lower(OmniLead.sector).like(term)
        )

    all_leads = list(db.scalars(query.order_by(OmniLead.id.desc())).all())
    total = len(all_leads)
    offset = (page - 1) * page_size
    paged = all_leads[offset : offset + page_size]

    # Global summary counters
    all_all = db.scalars(select(OmniLead)).all()
    summary = {
        "total": len(all_all),
        "instagram": sum(1 for l in all_all if l.source_platform == "INSTAGRAM"),
        "facebook": sum(1 for l in all_all if l.source_platform == "FACEBOOK"),
        "google_forms": sum(1 for l in all_all if l.source_platform == "GOOGLE_FORMS"),
        "whatsapp": sum(1 for l in all_all if l.source_platform in ("WHATSAPP", "WHATSAPP_DIRECT")),
        "converted": sum(1 for l in all_all if l.lead_stage == "CONVERTED"),
    }

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "leads": [l.public() for l in paged],
        "summary": summary,
        "platform_counts": summary,
    }


@router.post("/leads", status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
def create_lead(
    payload: LeadCreatePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        norm_phone = normalize_indian_phone(payload.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    advisor = payload.assigned_to_username or assign_advisor_round_robin(db)
    lead = OmniLead(
        lead_code=next_lead_code(db),
        full_name=payload.full_name.strip(),
        company_name=payload.company_name.strip(),
        phone_number=norm_phone,
        email=payload.email.strip() if payload.email and payload.email.strip() else None,
        source_platform=payload.source_platform.strip().upper(),
        campaign_name=payload.campaign_name.strip(),
        state=payload.state.strip(),
        district=payload.district.strip(),
        sector=payload.sector.strip(),
        estimated_investment_lakhs=payload.estimated_investment_lakhs,
        estimated_subsidy_lakhs=payload.estimated_subsidy_lakhs,
        lead_stage="NEW",
        priority=payload.priority.strip().upper(),
        assigned_to_username=advisor,
        target_list_id=payload.target_list_id,
        notes=payload.notes,
        created_at_ist=ist_now(),
        updated_at_ist=ist_now(),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return {"message": f"Lead '{lead.lead_code}' recorded successfully.", "lead": lead.public()}


@router.put("/leads/{lead_id}", dependencies=[Depends(get_current_user)])
def update_lead(
    lead_id: int,
    payload: LeadUpdatePayload,
    db: Session = Depends(get_db),
):
    lead = db.get(OmniLead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    if payload.phone_number is not None and payload.phone_number.strip():
        try:
            lead.phone_number = normalize_indian_phone(payload.phone_number)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if payload.full_name is not None:
        lead.full_name = payload.full_name.strip()
    if payload.company_name is not None:
        lead.company_name = payload.company_name.strip()
    if payload.email is not None:
        lead.email = payload.email.strip() if payload.email.strip() else None
    if payload.district is not None:
        lead.district = payload.district.strip()
    if payload.sector is not None:
        lead.sector = payload.sector.strip()
    if payload.estimated_investment_lakhs is not None:
        lead.estimated_investment_lakhs = payload.estimated_investment_lakhs
    if payload.estimated_subsidy_lakhs is not None:
        lead.estimated_subsidy_lakhs = payload.estimated_subsidy_lakhs
    if payload.priority is not None and payload.priority.strip().upper() in LEAD_PRIORITIES:
        lead.priority = payload.priority.strip().upper()
    if payload.assigned_to_username is not None:
        lead.assigned_to_username = payload.assigned_to_username.strip()
    if payload.target_list_id is not None:
        lead.target_list_id = payload.target_list_id
    if payload.notes is not None:
        lead.notes = payload.notes.strip()

    lead.updated_at_ist = ist_now()
    db.commit()
    db.refresh(lead)
    return {"message": f"Lead '{lead.lead_code}' updated.", "lead": lead.public()}


@router.patch("/leads/{lead_id}/stage", dependencies=[Depends(get_current_user)])
def update_lead_stage(
    lead_id: int,
    payload: LeadStageUpdate,
    db: Session = Depends(get_db),
):
    lead = db.get(OmniLead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    st = payload.lead_stage.strip().upper()
    if st not in LEAD_STAGES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid lead stage '{st}'. Choose from: {', '.join(LEAD_STAGES)}")

    lead.lead_stage = st
    lead.updated_at_ist = ist_now()
    db.commit()
    db.refresh(lead)
    return {"message": f"Lead stage transitioned to {st}.", "lead": lead.public()}


@router.post("/leads/{lead_id}/convert", dependencies=[Depends(get_current_user)])
def convert_lead(
    lead_id: int,
    payload: LeadConvertPayload,
    db: Session = Depends(get_db),
):
    lead = db.get(OmniLead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    contact = convert_lead_to_contact(db, lead, target_list_id=payload.target_list_id)
    return {
        "message": f"Lead '{lead.lead_code}' successfully converted to HNI Client {contact.inquiry_id} ({contact.client_name}).",
        "contact": contact.public(),
        "lead": lead.public(),
    }
