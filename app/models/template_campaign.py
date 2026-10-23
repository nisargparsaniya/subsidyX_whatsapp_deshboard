"""WhatsApp templates and bulk marketing campaign records."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now
from app.models.whatsapp_message import DELIVERED, READ, REPLIED, SENT

TEMPLATE_CATEGORIES = ("WELCOME", "MARKETING", "SUBSIDY_ALERT", "CA_DOCUMENT_REQUEST")
LANGUAGES = ("en_IN", "gu_IN", "hi_IN")

CAMPAIGN_RUNNING = "RUNNING"
CAMPAIGN_COMPLETED = "COMPLETED"
CAMPAIGN_FAILED = "FAILED"

SENT_STATES = (SENT, DELIVERED, READ, REPLIED)
DELIVERED_STATES = (DELIVERED, READ, REPLIED)
READ_STATES = (READ, REPLIED)


class WhatsAppTemplate(Base):
    __tablename__ = "whatsapp_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    template_name: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[str] = mapped_column(String(32), default="MARKETING", index=True)
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
    segment: Mapped[str] = mapped_column(String(80), default="ALL", index=True)
    template_id: Mapped[int] = mapped_column(Integer, index=True)
    template_name: Mapped[str] = mapped_column(String(160), default="")
    total_targeted: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0)
    read_count: Mapped[int] = mapped_column(Integer, default=0)
    replied_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default=CAMPAIGN_RUNNING, index=True)
    launched_by: Mapped[str] = mapped_column(String(64), default="SYSTEM")
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now, index=True)

    @property
    def delivery_rate(self) -> float:
        if not self.total_targeted:
            return 0.0
        return round(self.delivered_count / self.total_targeted * 100, 1)

    def public(self) -> dict:
        return {
            "id": self.id,
            "campaign_name": self.campaign_name,
            "segment": self.segment,
            "template_id": self.template_id,
            "template_name": self.template_name,
            "total_targeted": self.total_targeted,
            "sent_count": self.sent_count,
            "delivered_count": self.delivered_count,
            "read_count": self.read_count,
            "replied_count": self.replied_count,
            "delivery_rate": self.delivery_rate,
            "status": self.status,
            "launched_by": self.launched_by,
            "is_mock": self.is_mock,
            "created_at": self.created_at.isoformat(),
        }
