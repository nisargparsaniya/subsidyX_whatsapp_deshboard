"""Runtime key/value settings — WhatsApp mode and Meta Cloud API credentials."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.config import settings
from app.database import Base
from app.models.audit_log import ist_now

WHATSAPP_MODE_KEY = "whatsapp_mode"
MOCK = "MOCK"
LIVE = "LIVE"

META_PHONE_NUMBER_ID = "meta_phone_number_id"
META_WABA_ID = "meta_waba_id"
META_ACCESS_TOKEN = "meta_access_token"
META_VERIFY_TOKEN = "meta_verify_token"

CREDENTIAL_KEYS = (META_PHONE_NUMBER_ID, META_WABA_ID, META_ACCESS_TOKEN)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_by: Mapped[str] = mapped_column(String(64), default="SYSTEM")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now, onupdate=ist_now)

    def public(self) -> dict:
        return {"key": self.key, "value": self.value, "updated_by": self.updated_by, "updated_at": self.updated_at.isoformat()}


def get_setting(db: Session, key: str, default: str | None = None) -> str | None:
    row = db.get(SystemSetting, key)
    return row.value if row is not None and row.value != "" else default


def set_setting(db: Session, key: str, value: str, updated_by: str = "SYSTEM") -> SystemSetting:
    row = db.get(SystemSetting, key)
    if row is None:
        row = SystemSetting(key=key, value=value, updated_by=updated_by)
        db.add(row)
    else:
        row.value = value
        row.updated_by = updated_by
    db.commit()
    return row


def get_whatsapp_mode(db: Session) -> str:
    """DB value wins (survives restarts), env default seeds the first boot."""
    return (get_setting(db, WHATSAPP_MODE_KEY) or settings.WHATSAPP_MODE or MOCK).upper()


def set_whatsapp_mode(db: Session, mode: str, updated_by: str = "SYSTEM") -> None:
    set_setting(db, WHATSAPP_MODE_KEY, mode.upper(), updated_by)


def mask_secret(value: str) -> str:
    if not value:
        return ""
    return f"{'*' * max(len(value) - 4, 4)}{value[-4:]}" if len(value) > 8 else "********"
