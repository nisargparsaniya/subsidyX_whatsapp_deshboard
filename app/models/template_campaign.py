"""WhatsApp templates and bulk marketing campaign records."""

from datetime import datetime
import json
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now
from app.models.whatsapp_message import DELIVERED, READ, REPLIED, SENT

TEMPLATE_CATEGORIES = (
    "WELCOME",
    "MARKETING",
    "SUBSIDY_ALERT",
    "CA_DOCUMENT_REQUEST",
    "SUBSIDY_SCHEME_LAUNCH",
    "INDUSTRIAL_POLICY_UPDATE",
    "CA_DOCUMENT_REMINDER",
    "SANCTION_MILESTONE",
    "LEAD_ONBOARDING",
    "EVENT_WEBINAR",
    "SEASONAL_ADVISORY",
)
LANGUAGES = ("en_IN", "gu_IN", "hi_IN")

CAMPAIGN_DRAFT = "DRAFT"
CAMPAIGN_SCHEDULED = "SCHEDULED"
CAMPAIGN_RUNNING = "RUNNING"
CAMPAIGN_COMPLETED = "COMPLETED"
CAMPAIGN_PAUSED = "PAUSED"
CAMPAIGN_CANCELLED = "CANCELLED"
CAMPAIGN_FAILED = "FAILED"

SCHEDULE_IMMEDIATE = "IMMEDIATE"
SCHEDULE_SCHEDULED = "SCHEDULED"

SENT_STATES = (SENT, DELIVERED, READ, REPLIED)
DELIVERED_STATES = (DELIVERED, READ, REPLIED)
READ_STATES = (READ, REPLIED)


class WhatsAppTemplate(Base):
    __tablename__ = "whatsapp_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    template_name: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[str] = mapped_column(String(60), default="MARKETING", index=True)
    language: Mapped[str] = mapped_column(String(10), default="en_IN")
    header_text: Mapped[str] = mapped_column(String(255), default="")
    body_text: Mapped[str] = mapped_column(Text, default="")
    footer_text: Mapped[str] = mapped_column(String(255), default="")
    buttons_json: Mapped[str] = mapped_column(Text, default="")
    is_welcome_default: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now)

    def public(self) -> dict:
        return {
            "id": self.id,
            "template_name": self.template_name,
            "category": self.category,
            "language": self.language,
            "header_text": self.header_text,
            "body_text": self.body_text,
            "footer_text": self.footer_text,
            "buttons_json": self.buttons_json,
            "is_welcome_default": self.is_welcome_default,
            "is_mock": self.is_mock,
            "created_at": self.created_at.isoformat(),
        }


class BulkCampaign(Base):
    __tablename__ = "bulk_campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_name: Mapped[str] = mapped_column(String(160))
    campaign_category: Mapped[str] = mapped_column(String(60), default="SUBSIDY_SCHEME_LAUNCH", index=True)
    segment: Mapped[str] = mapped_column(String(80), default="ALL", index=True)
    target_list_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    template_id: Mapped[int] = mapped_column(Integer, index=True)
    template_name: Mapped[str] = mapped_column(String(160), default="")
    total_targeted: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0)
    read_count: Mapped[int] = mapped_column(Integer, default=0)
    replied_count: Mapped[int] = mapped_column(Integer, default=0)
    schedule_type: Mapped[str] = mapped_column(String(20), default=SCHEDULE_IMMEDIATE, index=True)
    scheduled_at_ist: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True, default=None)
    executed_at_ist: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(30), default=CAMPAIGN_RUNNING, index=True)
    launched_by: Mapped[str] = mapped_column(String(64), default="SYSTEM")
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now, index=True)

    @property
    def target_list_ids(self) -> list[int]:
        try:
            return json.loads(self.target_list_ids_json) if self.target_list_ids_json else []
        except Exception:
            return []

    @property
    def delivery_rate(self) -> float:
        if not self.total_targeted:
            return 0.0
        return round(self.delivered_count / self.total_targeted * 100, 1)

    def public(self) -> dict:
        return {
            "id": self.id,
            "campaign_name": self.campaign_name,
            "campaign_category": self.campaign_category,
            "segment": self.segment,
            "target_list_ids": self.target_list_ids,
            "template_id": self.template_id,
            "template_name": self.template_name,
            "total_targeted": self.total_targeted,
            "sent_count": self.sent_count,
            "delivered_count": self.delivered_count,
            "read_count": self.read_count,
            "replied_count": self.replied_count,
            "delivery_rate": self.delivery_rate,
            "schedule_type": self.schedule_type,
            "scheduled_at_ist": self.scheduled_at_ist.isoformat() if self.scheduled_at_ist else None,
            "executed_at_ist": self.executed_at_ist.isoformat() if self.executed_at_ist else None,
            "status": self.status,
            "launched_by": self.launched_by,
            "is_mock": self.is_mock,
            "created_at": self.created_at.isoformat(),
        }
