"""Login audit trail — every attempt is recorded with client IP, user agent and IST time."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

IST = timezone(timedelta(hours=5, minutes=30), "IST")

SUCCESS = "SUCCESS"
INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
RATE_LIMITED_BLOCKED = "RATE_LIMITED_BLOCKED"
ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
OTP_SENT = "OTP_SENT"
OTP_REJECTED_UNREGISTERED_PHONE = "OTP_REJECTED_UNREGISTERED_PHONE"
OTP_INVALID_CODE = "OTP_INVALID_CODE"
OTP_EXPIRED = "OTP_EXPIRED"
OTP_LOCKED = "OTP_LOCKED"
PROFILE_UPDATED = "PROFILE_UPDATED"
CREDENTIALS_UPDATED = "CREDENTIALS_UPDATED"


def ist_now() -> datetime:
    """Naive IST clock — stored as-is so SQLite and PostgreSQL agree."""
    return datetime.now(IST).replace(tzinfo=None)


class LoginAuditLog(Base):
    __tablename__ = "login_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username_attempted: Mapped[str] = mapped_column(String(64), index=True)
    full_name: Mapped[str | None] = mapped_column(String(120), default=None)
    role_detected: Mapped[str | None] = mapped_column(String(16), default=None)
    ip_address: Mapped[str] = mapped_column(String(64), index=True)
    user_agent: Mapped[str] = mapped_column(String(512), default="")
    status: Mapped[str] = mapped_column(String(32), index=True)
    timestamp_ist: Mapped[datetime] = mapped_column(DateTime, default=ist_now, index=True)

    def public(self) -> dict:
        return {
            "id": self.id,
            "username_attempted": self.username_attempted,
            "full_name": self.full_name,
            "role_detected": self.role_detected,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "status": self.status,
            "timestamp_ist": self.timestamp_ist.isoformat(),
            "timestamp_display": self.timestamp_ist.strftime("%d %b %Y, %I:%M:%S %p IST"),
        }
