"""Login with auto-role detection, IP audit logging and a 5-attempt / 15-minute shield."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.audit_log import (
    ACCOUNT_LOCKED,
    INVALID_CREDENTIALS,
    RATE_LIMITED_BLOCKED,
    SUCCESS,
    LoginAuditLog,
    ist_now,
)
from app.models.user import User
from app.services.security import AUTH_COOKIE, client_ip, create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])

MAX_FAILED_ATTEMPTS = 5
LOCK_WINDOW_MINUTES = 15
LOCK_MESSAGE = "Security Shield Active: 5 failed login attempts detected from your IP. Access locked for 15 minutes."


class LoginPayload(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


def _log_attempt(
    db: Session, *, username: str, ip: str, user_agent: str, status: str, user: User | None = None
) -> None:
    db.add(
        LoginAuditLog(
            username_attempted=username,
            full_name=user.full_name if user else None,
            role_detected=user.role if user else None,
            ip_address=ip,
            user_agent=user_agent[:512],
            status=status,
            timestamp_ist=ist_now(),
        )
    )
    db.commit()


def _recent_failures(db: Session, ip: str, username: str) -> int:
    window_start = ist_now() - timedelta(minutes=LOCK_WINDOW_MINUTES)
    return db.scalar(
        select(func.count())
        .select_from(LoginAuditLog)
        .where(
            LoginAuditLog.status == INVALID_CREDENTIALS,
            LoginAuditLog.timestamp_ist >= window_start,
            or_(LoginAuditLog.ip_address == ip, LoginAuditLog.username_attempted == username),
        )
    ) or 0


@router.post("/login")
def login(payload: LoginPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    username = payload.username.strip().lower()

    if _recent_failures(db, ip, username) >= MAX_FAILED_ATTEMPTS:
        _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=RATE_LIMITED_BLOCKED)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=LOCK_MESSAGE)

    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(payload.password, user.password_hash):
        _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=INVALID_CREDENTIALS)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Employee ID or password.")

    if not user.is_active:
        _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=ACCOUNT_LOCKED, user=user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated by an administrator.",
        )

    _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=SUCCESS, user=user)
    response.set_cookie(
        AUTH_COOKIE,
        create_access_token(user),
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        # ponytail: plain HTTP on localhost for the demo; flip to secure=True behind HTTPS.
        secure=False,
    )
    return {"message": f"Welcome back, {user.full_name}", "user": user.public()}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(AUTH_COOKIE, path="/")
    return {"message": "Signed out successfully."}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"user": user.public(), "ist_time": ist_now().strftime("%d %b %Y, %I:%M:%S %p IST")}
