"""Stateful User Session model for dual JWT + Session token architecture."""

from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.audit_log import ist_now


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    jwt_jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at_ist: Mapped[datetime] = mapped_column(DateTime, default=ist_now)
    expires_at_ist: Mapped[datetime] = mapped_column(DateTime, index=True)
    revoked_at_ist: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_by: Mapped[str | None] = mapped_column(String(60), nullable=True)

    def public(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_token": self.session_token[:12] + "...",
            "jwt_jti": self.jwt_jti,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "is_active": self.is_active,
            "created_at_ist": self.created_at_ist.isoformat() if self.created_at_ist else None,
            "expires_at_ist": self.expires_at_ist.isoformat() if self.expires_at_ist else None,
            "revoked_at_ist": self.revoked_at_ist.isoformat() if self.revoked_at_ist else None,
        }
