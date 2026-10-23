"""Every WhatsApp bubble — bulk campaign sends, manual replies and inbound client messages."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now

INBOUND = "INBOUND"
OUTBOUND = "OUTBOUND"

SENT = "SENT"
DELIVERED = "DELIVERED"
READ = "READ"
REPLIED = "REPLIED"
RECEIVED = "RECEIVED"
FAILED = "FAILED"

# Cumulative funnel stages — a REPLIED bubble has also been sent, delivered and read.
FUNNEL_STAGES = {
    SENT: (SENT, DELIVERED, READ, REPLIED),
    DELIVERED: (DELIVERED, READ, REPLIED),
    READ: (READ, REPLIED),
    REPLIED: (REPLIED,),
}

TEXT = "TEXT"
TEMPLATE = "TEMPLATE"
INTERACTIVE = "INTERACTIVE"


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contact_id: Mapped[int] = mapped_column(Integer, index=True)
    campaign_id: Mapped[int | None] = mapped_column(Integer, default=None, index=True)
    template_id: Mapped[int | None] = mapped_column(Integer, default=None)
    chatbot_flow_id: Mapped[int | None] = mapped_column(Integer, default=None)
    direction: Mapped[str] = mapped_column(String(10), index=True)
    message_type: Mapped[str] = mapped_column(String(16), default=TEXT)
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default=SENT, index=True)
    wa_message_id: Mapped[str] = mapped_column(String(120), default="")
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now, index=True)

    def public(self) -> dict:
        return {
            "id": self.id,
            "contact_id": self.contact_id,
            "campaign_id": self.campaign_id,
            "template_id": self.template_id,
            "chatbot_flow_id": self.chatbot_flow_id,
            "direction": self.direction,
            "message_type": self.message_type,
            "body": self.body,
            "status": self.status,
            "wa_message_id": self.wa_message_id,
            "is_mock": self.is_mock,
            "created_at": self.created_at.isoformat(),
            "created_at_display": self.created_at.strftime("%d %b %Y, %I:%M %p IST"),
        }
