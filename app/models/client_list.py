"""Client Lists and audience categorization for targeted subsidy marketing."""

from datetime import datetime
import json
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now

LIST_CATEGORIES = (
    "SECTOR_SEGMENT",
    "SUBSIDY_TIER",
    "GEOGRAPHY",
    "LIFECYCLE_STAGE",
    "CUSTOM_VIP",
)


class ClientList(Base):
    __tablename__ = "client_lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    list_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    category: Mapped[str] = mapped_column(String(60), default="SECTOR_SEGMENT", index=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    color_hex: Mapped[str] = mapped_column(String(16), default="#4080E0")
    filter_rules_json: Mapped[str] = mapped_column(Text, default="{}")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(60), default="SYSTEM")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now)

    @property
    def filter_rules(self) -> dict[str, Any]:
        try:
            return json.loads(self.filter_rules_json) if self.filter_rules_json else {}
        except Exception:
            return {}

    def public(self, member_count: int = 0) -> dict[str, Any]:
        return {
            "id": self.id,
            "list_code": self.list_code,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "color_hex": self.color_hex,
            "filter_rules": self.filter_rules,
            "is_active": self.is_active,
            "member_count": member_count,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
        }


class ClientListMembership(Base):
    __tablename__ = "client_list_memberships"
    __table_args__ = (
        UniqueConstraint("list_id", "contact_id", name="uq_list_contact"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    list_id: Mapped[int] = mapped_column(Integer, ForeignKey("client_lists.id", ondelete="CASCADE"), index=True)
    contact_id: Mapped[int] = mapped_column(Integer, ForeignKey("hni_contacts.id", ondelete="CASCADE"), index=True)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now)
