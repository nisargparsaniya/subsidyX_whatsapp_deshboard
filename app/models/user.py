"""Internal staff accounts (Admins, CAs, Relationship Managers) — HNI clients never log in."""

from datetime import datetime
import secrets

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.database import Base
from app.models.audit_log import ist_now

ADMIN = "ADMIN"
EMPLOYEE = "EMPLOYEE"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    phone_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, default="")
    email: Mapped[str | None] = mapped_column(String(120), nullable=True, default=None)
    full_name: Mapped[str] = mapped_column(String(120))
    designation: Mapped[str] = mapped_column(String(160), default="")
    role: Mapped[str] = mapped_column(String(16), default=EMPLOYEE)
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[str] = mapped_column(String(500), default="/static/img/logo-mark.png")
    avatar_source: Mapped[str] = mapped_column(String(40), default="DEFAULT_LOGO")
    created_by: Mapped[str] = mapped_column(String(64), default="SYSTEM")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ist_now)

    @property
    def is_admin(self) -> bool:
        return self.role == ADMIN

    def public(self) -> dict:
        """Safe payload — the password hash never leaves the server."""
        return {
            "id": self.id,
            "username": self.username,
            "phone_number": self.phone_number,
            "email": self.email,
            "full_name": self.full_name,
            "designation": self.designation,
            "role": self.role,
            "is_active": self.is_active,
            "avatar_url": self.avatar_url or "/static/img/logo-mark.png",
            "avatar_source": self.avatar_source or "DEFAULT_LOGO",
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
        }


class OTPChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    phone_number: Mapped[str] = mapped_column(String(20), index=True)
    otp_hash: Mapped[str] = mapped_column(String(255))
    challenge_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    attempts_used: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    expires_at_ist: Mapped[datetime] = mapped_column(DateTime, index=True)
    consumed_at_ist: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
    created_at_ist: Mapped[datetime] = mapped_column(DateTime, default=ist_now)

    def is_valid(self) -> bool:
        return (
            self.consumed_at_ist is None
            and ist_now() <= self.expires_at_ist
            and self.attempts_used < self.max_attempts
        )


def seed_users(db: Session) -> None:
    from app.config import settings
    from app.services.security import hash_password  # local import: avoids an import cycle

    # 1. Sync Super Admins from BOOTSTRAP_ADMIN_PHONES
    bootstrap_admins = settings.get_bootstrap_admin_phones()
    for item in bootstrap_admins:
        phone = item["phone_number"]
        username = item["username"]
        # Find user by phone or username
        user = db.scalar(select(User).where((User.phone_number == phone) | (User.username == username)))
        if user is None:
            user = User(
                username=username,
                phone_number=phone,
                full_name=item["full_name"],
                designation=item["designation"],
                role=ADMIN,
                password_hash=hash_password(f"Subsidy@{secrets.randbelow(9000)+1000}"),
                is_active=True,
                created_by="SYSTEM_BOOTSTRAP",
            )
            db.add(user)
        else:
            user.phone_number = phone
            user.full_name = item["full_name"]
            user.designation = item["designation"]
            user.role = ADMIN
            user.is_active = True

    # 2. Sync additional users from ADMIN_INITIAL_USERS (e.g. emp_rahul)
    for item in settings.get_initial_users():
        username = item.get("username", "").strip()
        if not username:
            continue
        existing_user = db.scalar(select(User).where(User.username == username))
        if existing_user is None:
            # Generate dummy initial phone for staff if not bootstrap admin
            dummy_phone = f"+9198{secrets.randbelow(90000000)+10000000}"
            db.add(
                User(
                    username=username,
                    phone_number=dummy_phone,
                    full_name=item.get("full_name", username),
                    designation=item.get("designation", ""),
                    role=item.get("role", EMPLOYEE),
                    password_hash=hash_password(item.get("password", "Subsidy@2026")),
                    is_active=True,
                    created_by="SYSTEM",
                )
            )
        elif not existing_user.phone_number:
            # assign a dummy valid phone if empty
            existing_user.phone_number = f"+9198{secrets.randbelow(90000000)+10000000}"

    db.commit()
