"""CA & Associates Network ORM Model — Separate from Industrialist Subsidy Clients."""

from datetime import datetime
import json
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now


class CAAssociateProfile(Base):
    __tablename__ = "ca_associate_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ca_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), index=True)
    firm_name: Mapped[str] = mapped_column(String(160), default="")
    icai_membership_no: Mapped[str] = mapped_column(String(40), default="")
    phone_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(120), default="")
    city_district: Mapped[str] = mapped_column(String(80), default="")
    specialization: Mapped[str] = mapped_column(String(120), default="Project Finance & Term Loan")
    associates_list_json: Mapped[str] = mapped_column(Text, default="[]")
    referred_industrialists_count: Mapped[int] = mapped_column(Integer, default=0)
    avatar_url: Mapped[str] = mapped_column(String(500), default="/static/img/logo-mark.png")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ist_now)

    @property
    def associates(self) -> list[dict]:
        try:
            return json.loads(self.associates_list_json or "[]")
        except Exception:
            return []

    def public(self) -> dict:
        return {
            "id": self.id,
            "ca_code": self.ca_code,
            "full_name": self.full_name,
            "firm_name": self.firm_name,
            "icai_membership_no": self.icai_membership_no,
            "phone_number": self.phone_number,
            "email": self.email,
            "city_district": self.city_district,
            "specialization": self.specialization,
            "associates": self.associates,
            "referred_industrialists_count": self.referred_industrialists_count,
            "avatar_url": self.avatar_url or "/static/img/logo-mark.png",
            "is_active": self.is_active,
            "created_at_ist": self.created_at_ist.isoformat() if self.created_at_ist else None,
        }
