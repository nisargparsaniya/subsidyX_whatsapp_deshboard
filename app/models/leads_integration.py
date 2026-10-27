"""Omnichannel lead capture and CRM for Instagram, Facebook, Google Forms & WhatsApp."""

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now

PLATFORMS = ("INSTAGRAM", "FACEBOOK", "GOOGLE_FORMS", "WHATSAPP_DIRECT", "MANUAL_ENTRY")
LEAD_STAGES = ("NEW", "CONTACTED", "QUALIFIED", "DOCUMENTS_COLLECTED", "CONVERTED", "ARCHIVED")
LEAD_PRIORITIES = ("HIGH", "MEDIUM", "LOW")


class IntegrationChannel(Base):
    __tablename__ = "integration_channels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    account_or_form_id: Mapped[str] = mapped_column(String(120), default="")
    webhook_verify_token: Mapped[str] = mapped_column(String(120), default="")
    api_token_encrypted: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    default_list_id: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    auto_send_welcome: Mapped[bool] = mapped_column(Boolean, default=True)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=True)
    total_leads_synced: Mapped[int] = mapped_column(Integer, default=0)
    last_lead_at_ist: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "platform": self.platform,
            "display_name": self.display_name,
            "account_or_form_id": self.account_or_form_id,
            "webhook_verify_token": self.webhook_verify_token,
            "default_list_id": self.default_list_id,
            "auto_send_welcome": self.auto_send_welcome,
            "is_connected": self.is_connected,
            "total_leads_synced": self.total_leads_synced,
            "last_lead_at_ist": self.last_lead_at_ist.isoformat() if self.last_lead_at_ist else None,
        }


class SocialCampaignPost(Base):
    __tablename__ = "social_campaign_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    platform: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(150))
    content_caption: Mapped[str] = mapped_column(Text, default="")
    target_sector: Mapped[str] = mapped_column(String(80), default="")
    landing_or_form_url: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(30), default="PUBLISHED", index=True)
    scheduled_at_ist: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
    leads_captured_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str] = mapped_column(String(64), default="SYSTEM")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now)

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "post_code": self.post_code,
            "platform": self.platform,
            "title": self.title,
            "content_caption": self.content_caption,
            "target_sector": self.target_sector,
            "landing_or_form_url": self.landing_or_form_url,
            "status": self.status,
            "scheduled_at_ist": self.scheduled_at_ist.isoformat() if self.scheduled_at_ist else None,
            "leads_captured_count": self.leads_captured_count,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
        }


class OmniLead(Base):
    __tablename__ = "omni_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), index=True)
    company_name: Mapped[str] = mapped_column(String(150), default="", index=True)
    phone_number: Mapped[str] = mapped_column(String(20), index=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True, default=None)
    source_platform: Mapped[str] = mapped_column(String(40), index=True)
    source_post_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("social_campaign_posts.id", ondelete="SET NULL"), nullable=True)
    campaign_name: Mapped[str] = mapped_column(String(150), default="")
    state: Mapped[str] = mapped_column(String(50), default="Gujarat")
    district: Mapped[str] = mapped_column(String(80), default="")
    sector: Mapped[str] = mapped_column(String(100), default="")
    estimated_investment_lakhs: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_subsidy_lakhs: Mapped[float] = mapped_column(Float, default=0.0)
    lead_stage: Mapped[str] = mapped_column(String(40), default="NEW", index=True)
    priority: Mapped[str] = mapped_column(String(20), default="HIGH")
    assigned_to_username: Mapped[str] = mapped_column(String(64), default="", index=True)
    target_list_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    converted_contact_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at_ist: Mapped[datetime] = mapped_column(DateTime, default=ist_now, index=True)
    updated_at_ist: Mapped[datetime] = mapped_column(DateTime, default=ist_now, onupdate=ist_now)

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "lead_code": self.lead_code,
            "full_name": self.full_name,
            "company_name": self.company_name,
            "phone_number": self.phone_number,
            "email": self.email,
            "source_platform": self.source_platform,
            "source_post_id": self.source_post_id,
            "campaign_name": self.campaign_name,
            "state": self.state,
            "district": self.district,
            "sector": self.sector,
            "estimated_investment_lakhs": self.estimated_investment_lakhs,
            "estimated_subsidy_lakhs": self.estimated_subsidy_lakhs,
            "lead_stage": self.lead_stage,
            "priority": self.priority,
            "assigned_to_username": self.assigned_to_username,
            "target_list_id": self.target_list_id,
            "notes": self.notes or "",
            "converted_contact_id": self.converted_contact_id,
            "created_at_ist": self.created_at_ist.isoformat(),
            "updated_at_ist": self.updated_at_ist.isoformat(),
        }
