"""HNI client contact book — internal CRM rows only; clients never sign in."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.database import Base
from app.models.audit_log import ist_now

SECTORS = ("Textile Industry", "Information Technology", "Pharmaceuticals", "Green Energy")
ENTERPRISE_CLASSES = ("MSME - Small", "MSME - Medium", "Large Enterprise", "Startup")
CATEGORIES = ("Manufacturing", "Services", "Trading", "Agro Processing")
PROJECT_TYPES = ("New", "Expansion")
YES_NO = ("Yes", "No")


class HniContact(Base):
    __tablename__ = "hni_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inquiry_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    client_name: Mapped[str] = mapped_column(String(120))
    company_name: Mapped[str] = mapped_column(String(160), default="")
    whatsapp_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(160), default="")
    state: Mapped[str] = mapped_column(String(60), default="Gujarat")
    district: Mapped[str] = mapped_column(String(80), default="")
    taluka: Mapped[str] = mapped_column(String(80), default="")
    sector: Mapped[str] = mapped_column(String(60), default="", index=True)
    category: Mapped[str] = mapped_column(String(60), default="")
    enterprise_classification: Mapped[str] = mapped_column(String(40), default="", index=True)
    term_loan_planned: Mapped[str] = mapped_column(String(8), default="No")
    project_type: Mapped[str] = mapped_column(String(16), default="New")
    estimated_subsidy_lakhs: Mapped[float] = mapped_column(Float, default=0.0)
    tags: Mapped[str] = mapped_column(String(255), default="")
    opt_in_status: Mapped[bool] = mapped_column(Boolean, default=True)
    assigned_ca: Mapped[str] = mapped_column(String(120), default="")
    client_profile_type: Mapped[str] = mapped_column(String(40), default="INDUSTRIALIST", index=True)
    client_tier: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None, index=True)
    avatar_url: Mapped[str] = mapped_column(String(500), default="/static/img/logo-mark.png")
    avatar_source: Mapped[str] = mapped_column(String(40), default="DEFAULT_LOGO")
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now)

    @property
    def tag_list(self) -> list[str]:
        return [tag.strip() for tag in self.tags.split(",") if tag.strip()]

    def add_tags(self, *names: str) -> None:
        merged = self.tag_list
        for name in names:
            name = name.strip()
            if name and name.lower() not in {tag.lower() for tag in merged}:
                merged.append(name)
        self.tags = ", ".join(merged)[:255]

    def public(self, is_admin: bool = True) -> dict:
        return {
            "id": self.id,
            "inquiry_id": self.inquiry_id,
            "client_name": self.client_name,
            "company_name": self.company_name,
            "whatsapp_number": self.whatsapp_number,
            "email": self.email,
            "state": self.state,
            "district": self.district,
            "taluka": self.taluka,
            "sector": self.sector,
            "category": self.category,
            "enterprise_classification": self.enterprise_classification,
            "term_loan_planned": self.term_loan_planned,
            "project_type": self.project_type,
            "estimated_subsidy_lakhs": self.estimated_subsidy_lakhs,
            "client_profile_type": self.client_profile_type or "INDUSTRIALIST",
            "client_tier": self.client_tier if is_admin else None,
            "avatar_url": self.avatar_url or "/static/img/logo-mark.png",
            "avatar_source": self.avatar_source or "DEFAULT_LOGO",
            "tags": self.tags,
            "tag_list": self.tag_list,
            "opt_in_status": self.opt_in_status,
            "assigned_ca": self.assigned_ca,
            "is_mock": self.is_mock,
            "created_at": self.created_at.isoformat(),
        }


def next_inquiry_id(db: Session) -> str:
    """Continue the #123 / #938 style numbering from the highest existing id."""
    numbers = [
        int(value[1:])
        for value in db.scalars(select(HniContact.inquiry_id)).all()
        if value and value[1:].isdigit()
    ]
    return f"#{max(numbers, default=99) + 1}"
