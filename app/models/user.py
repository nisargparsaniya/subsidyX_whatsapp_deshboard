"""Internal staff accounts (Admins, CAs, Relationship Managers) — HNI clients never log in."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.database import Base
from app.models.audit_log import ist_now

ADMIN = "ADMIN"
EMPLOYEE = "EMPLOYEE"

# Seeded once at startup; passwords are hashed, never stored in clear.
SEED_USERS = (
    ("nisarg", "Nisarg Parsaniya", "System Architect & Super Admin", ADMIN, "Nisarg@2026"),
    ("gajendra", "Gajendra Jain", "Managing Director & Super Admin", ADMIN, "Gajendra@2026"),
    ("abhishek", "CA Abhishek Jain", "Principal Chartered Accountant & Super Admin", ADMIN, "Abhishek@2026"),
    ("emp_rahul", "Rahul Desai", "Subsidy Relationship Executive", EMPLOYEE, "Rahul@2026"),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    designation: Mapped[str] = mapped_column(String(160), default="")
    role: Mapped[str] = mapped_column(String(16), default=EMPLOYEE)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
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
            "full_name": self.full_name,
            "designation": self.designation,
            "role": self.role,
            "is_active": self.is_active,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
        }


def seed_users(db: Session) -> None:
    from app.services.security import hash_password  # local import: avoids an import cycle

    existing = set(db.scalars(select(User.username)).all())
    for username, full_name, designation, role, password in SEED_USERS:
        if username in existing:
            continue
        db.add(
            User(
                username=username,
                full_name=full_name,
                designation=designation,
                role=role,
                password_hash=hash_password(password),
                created_by="SYSTEM",
            )
        )
    db.commit()
