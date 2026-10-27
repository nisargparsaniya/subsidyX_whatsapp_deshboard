from datetime import datetime, timedelta
import hashlib
import hmac
from pathlib import Path
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from jose import jwt
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.audit_log import (
    ACCOUNT_LOCKED,
    CREDENTIALS_UPDATED,
    INVALID_CREDENTIALS,
    OTP_EXPIRED,
    OTP_INVALID_CODE,
    OTP_LOCKED,
    OTP_REJECTED_UNREGISTERED_PHONE,
    OTP_SENT,
    PROFILE_UPDATED,
    RATE_LIMITED_BLOCKED,
    SUCCESS,
    LoginAuditLog,
    ist_now,
)
from app.models.user import OTPChallenge, User
from app.models.user_session import UserSession
from app.services.cache import invalidate_cache_prefix
from app.services.lead_service import normalize_indian_phone
from app.services.otp_dispatcher import send_otp
from app.services.security import (
    AUTH_COOKIE,
    SESSION_COOKIE,
    _token_from,
    client_ip,
    create_access_token,
    get_current_user,
    hash_password,
    issue_dual_tokens,
    revoke_user_sessions,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

MAX_FAILED_ATTEMPTS = 5
LOCK_WINDOW_MINUTES = 15
LOCK_MESSAGE = "Security Shield Active: 5 failed attempts detected. Access temporarily locked for 15 minutes."


def hash_otp(otp_code: str) -> str:
    """HMAC-SHA256 hash of the 6-digit OTP using the server SECRET_KEY."""
    return hmac.new(settings.SECRET_KEY.encode(), str(otp_code).strip().encode(), hashlib.sha256).hexdigest()


def verify_otp_hash(otp_code: str, expected_hash: str) -> bool:
    """Constant-time verification of candidate OTP code."""
    candidate_hash = hash_otp(otp_code)
    return hmac.compare_digest(candidate_hash, expected_hash)


def _log_attempt(
    db: Session,
    *,
    username: str,
    ip: str,
    user_agent: str,
    status: str,
    user: User | None = None,
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


def _is_rate_limited(db: Session, ip: str, identifier: str) -> bool:
    window_start = ist_now() - timedelta(minutes=LOCK_WINDOW_MINUTES)
    failure_statuses = (INVALID_CREDENTIALS, OTP_INVALID_CODE, OTP_LOCKED, RATE_LIMITED_BLOCKED)
    
    # Check IP + identifier combo (>= 5 failures)
    combo_failures = db.scalar(
        select(func.count())
        .select_from(LoginAuditLog)
        .where(
            LoginAuditLog.status.in_(failure_statuses),
            LoginAuditLog.timestamp_ist >= window_start,
            LoginAuditLog.ip_address == ip,
            LoginAuditLog.username_attempted == identifier,
        )
    ) or 0
    if combo_failures >= MAX_FAILED_ATTEMPTS:
        return True

    # Check total IP failures (>= 10 failures)
    ip_failures = db.scalar(
        select(func.count())
        .select_from(LoginAuditLog)
        .where(
            LoginAuditLog.status.in_(failure_statuses),
            LoginAuditLog.timestamp_ist >= window_start,
            LoginAuditLog.ip_address == ip,
        )
    ) or 0
    return ip_failures >= 10


# --------------------------------------------------------------------------- OTP Request & Verify


class RequestOtpPayload(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)


class VerifyOtpPayload(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)
    challenge_token: str = Field(min_length=32, max_length=64)
    otp_code: str = Field(min_length=6, max_length=6)


@router.post("/request-otp")
def request_otp(payload: RequestOtpPayload, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    try:
        normalized_phone = normalize_indian_phone(payload.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Check rate limit
    if _is_rate_limited(db, ip, normalized_phone):
        _log_attempt(db, username=normalized_phone, ip=ip, user_agent=user_agent, status=RATE_LIMITED_BLOCKED)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=LOCK_MESSAGE,
            headers={"Retry-After": "900"},
        )

    # Look up registered and active staff
    user = db.scalar(select(User).where(User.phone_number == normalized_phone))
    if user is None or not user.is_active:
        _log_attempt(
            db,
            username=normalized_phone,
            ip=ip,
            user_agent=user_agent,
            status=OTP_REJECTED_UNREGISTERED_PHONE,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: This mobile number is not authorized for console access.",
        )

    # Invalidate previous unconsumed challenges for this user
    existing_challenges = db.scalars(
        select(OTPChallenge).where(
            OTPChallenge.user_id == user.id,
            OTPChallenge.consumed_at_ist.is_(None),
        )
    ).all()
    for ch in existing_challenges:
        ch.consumed_at_ist = ist_now()

    # Generate 6-digit cryptographic OTP and correlation token
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    challenge_token = secrets.token_hex(32)
    challenge = OTPChallenge(
        user_id=user.id,
        phone_number=normalized_phone,
        otp_hash=hash_otp(otp_code),
        challenge_token=challenge_token,
        attempts_used=0,
        max_attempts=3,
        ip_address=ip,
        expires_at_ist=ist_now() + timedelta(seconds=120),
        created_at_ist=ist_now(),
    )
    db.add(challenge)
    db.commit()

    # Dispatch to SMS/terminal/Firebase gateway (2-minute validity)
    dispatch = send_otp(normalized_phone, otp_code, user.full_name)
    _log_attempt(db, username=normalized_phone, ip=ip, user_agent=user_agent, status=OTP_SENT, user=user)

    masked_phone = "+91 ••••••" + normalized_phone[-4:]
    return {
        "status": "otp_sent",
        "challenge_token": challenge_token,
        "masked_phone": masked_phone,
        "expires_in_seconds": 120,
    }


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    try:
        normalized_phone = normalize_indian_phone(payload.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if _is_rate_limited(db, ip, normalized_phone):
        _log_attempt(db, username=normalized_phone, ip=ip, user_agent=user_agent, status=RATE_LIMITED_BLOCKED)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=LOCK_MESSAGE,
            headers={"Retry-After": "900"},
        )

    challenge = db.scalar(
        select(OTPChallenge).where(
            OTPChallenge.challenge_token == payload.challenge_token.strip(),
            OTPChallenge.phone_number == normalized_phone,
        )
    )

    if challenge is None or challenge.consumed_at_ist is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used OTP challenge. Please request a new OTP.",
        )

    if ist_now() > challenge.expires_at_ist:
        _log_attempt(db, username=normalized_phone, ip=ip, user_agent=user_agent, status=OTP_EXPIRED)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The OTP has expired (2 minute validity window). Please request a fresh OTP.",
        )

    if challenge.attempts_used >= challenge.max_attempts:
        _log_attempt(db, username=normalized_phone, ip=ip, user_agent=user_agent, status=OTP_LOCKED)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect OTP attempts. This challenge is locked. Please request a new OTP.",
        )

    # Constant-time HMAC match
    if not verify_otp_hash(payload.otp_code.strip(), challenge.otp_hash):
        challenge.attempts_used += 1
        db.commit()
        if challenge.attempts_used >= challenge.max_attempts:
            _log_attempt(db, username=normalized_phone, ip=ip, user_agent=user_agent, status=OTP_LOCKED)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security lockout: 3 incorrect OTP attempts. Challenge invalidated. Request a fresh OTP.",
            )
        _log_attempt(db, username=normalized_phone, ip=ip, user_agent=user_agent, status=OTP_INVALID_CODE)
        remaining = challenge.max_attempts - challenge.attempts_used
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect 6-digit OTP code. {remaining} attempt(s) remaining.",
        )

    # OTP Verified Successfully
    challenge.consumed_at_ist = ist_now()
    user = db.get(User, challenge.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")

    # Issue Dual JWT + Stateful UserSession Token
    jwt_token, session_token, user_session = issue_dual_tokens(db, user, ip_address=ip, user_agent=user_agent)

    response.set_cookie(
        AUTH_COOKIE,
        jwt_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    response.set_cookie(
        SESSION_COOKIE,
        session_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    _log_attempt(db, username=user.username, ip=ip, user_agent=user_agent, status=SUCCESS, user=user)

    return {
        "status": "ok",
        "role": user.role,
        "full_name": user.full_name,
        "redirect_url": "/dashboard",
        "access_token": jwt_token,
        "session_token": session_token,
        "user": user.public(),
    }


# --------------------------------------------------------------------------- Password Login (Fallback)


class LoginPayload(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


@router.post("/login")
def login(payload: LoginPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    username = payload.username.strip().lower()

    if _is_rate_limited(db, ip, username):
        _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=RATE_LIMITED_BLOCKED)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=LOCK_MESSAGE)

    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(payload.password, user.password_hash):
        _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=INVALID_CREDENTIALS)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid User ID or password.")

    if not user.is_active:
        _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=ACCOUNT_LOCKED, user=user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated by an administrator.",
        )

    _log_attempt(db, username=username, ip=ip, user_agent=user_agent, status=SUCCESS, user=user)
    jwt_token, session_token, _ = issue_dual_tokens(db, user, ip_address=ip, user_agent=user_agent)
    response.set_cookie(
        AUTH_COOKIE,
        jwt_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    response.set_cookie(
        SESSION_COOKIE,
        session_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return {
        "message": f"Welcome back, {user.full_name}",
        "user": user.public(),
        "access_token": jwt_token,
        "session_token": session_token,
    }


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = _token_from(request)
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            sub_id = payload.get("sub_id")
            if sub_id:
                revoke_user_sessions(db, int(sub_id), revoked_by="SELF")
        except Exception:
            pass
    response.delete_cookie(AUTH_COOKIE, path="/")
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"message": "Signed out successfully."}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"user": user.public(), "ist_time": ist_now().strftime("%d %b %Y, %I:%M:%S %p IST")}


# --------------------------------------------------------------------------- Profile Self-Service


class UpdateProfilePayload(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone_number: str | None = Field(default=None, min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    designation: str | None = Field(default=None, max_length=160)
    current_password: str | None = Field(default=None, min_length=1, max_length=128)
    new_password: str | None = Field(default=None, min_length=6, max_length=128)


@router.put("/profile")
def update_profile(
    payload: UpdateProfilePayload,
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # If password change requested or password already set, verify current password
    if payload.new_password:
        if user.password_hash and not payload.current_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password required to set a new password.")
        if user.password_hash and payload.current_password and not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password verification failed.")
        user.password_hash = hash_password(payload.new_password.strip())

    old_username = user.username
    old_full_name = user.full_name
    username_changed = False

    if payload.username is not None:
        new_username = payload.username.strip().lower()
        if new_username != old_username:
            existing = db.scalar(select(User).where(User.username == new_username, User.id != user.id))
            if existing is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username '{new_username}' is already in use.")
            user.username = new_username
            username_changed = True

    if payload.phone_number is not None and payload.phone_number.strip():
        norm_phone = normalize_indian_phone(payload.phone_number)
        if norm_phone != user.phone_number:
            existing_phone = db.scalar(select(User).where(User.phone_number == norm_phone, User.id != user.id))
            if existing_phone is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Mobile number '{norm_phone}' is already registered to another account.")
            user.phone_number = norm_phone

    if payload.email is not None:
        user.email = payload.email.strip() if payload.email.strip() else None

    if payload.full_name is not None and payload.full_name.strip():
        user.full_name = payload.full_name.strip()

    if payload.designation is not None:
        user.designation = payload.designation.strip()

    # Update assigned_ca in hni_contacts
    from app.models.contact import HniContact
    from sqlalchemy import update
    if username_changed:
        db.execute(update(HniContact).where(HniContact.assigned_ca == old_username).values(assigned_ca=user.username))
    if payload.full_name is not None and user.full_name != old_full_name:
        db.execute(update(HniContact).where(HniContact.assigned_ca == old_full_name).values(assigned_ca=user.full_name))

    db.commit()
    db.refresh(user)

    invalidate_cache_prefix("users")
    invalidate_cache_prefix("contacts")

    new_token = create_access_token(user)
    response.set_cookie(
        AUTH_COOKIE,
        new_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    db.add(
        LoginAuditLog(
            username_attempted=user.username,
            full_name=user.full_name,
            role_detected=user.role,
            ip_address=client_ip(request),
            user_agent=request.headers.get("user-agent", "")[:512],
            status=PROFILE_UPDATED,
            timestamp_ist=ist_now(),
        )
    )
    db.commit()

    return {
        "status": "ok",
        "message": "Profile updated successfully.",
        "user": user.public(),
        "access_token": new_token,
    }


# --------------------------------------------------------------------------- Avatar Management


AVATARS_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads" / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)


class WhatsAppAvatarPayload(BaseModel):
    whatsapp_avatar_url: str = Field(min_length=1, max_length=500)


@router.post("/profile/avatar-upload")
async def upload_profile_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image size exceeds 5MB limit.")

    ext = ".png"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        ext = ".png"
    elif contents.startswith(b"\xff\xd8\xff"):
        ext = ".jpg"
    elif contents.startswith(b"RIFF") and b"WEBP" in contents[:16]:
        ext = ".webp"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file. Only PNG, JPEG, or WebP allowed.")

    filename = f"user_{user.id}_{secrets.token_hex(6)}{ext}"
    dest = AVATARS_DIR / filename
    dest.write_bytes(contents)

    user.avatar_url = f"/static/uploads/avatars/{filename}"
    user.avatar_source = "GALLERY_UPLOAD"
    db.commit()
    db.refresh(user)
    invalidate_cache_prefix("users")

    return {
        "status": "ok",
        "message": "Avatar uploaded successfully.",
        "avatar_url": user.avatar_url,
        "avatar_source": user.avatar_source,
        "user": user.public(),
    }


@router.post("/profile/avatar-whatsapp")
def sync_profile_avatar_whatsapp(
    payload: WhatsAppAvatarPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = payload.whatsapp_avatar_url.strip()
    if not (url.startswith("http://") or url.startswith("https://") or url.startswith("/static/")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image URL.")

    user.avatar_url = url
    user.avatar_source = "WHATSAPP_SYNC"
    db.commit()
    db.refresh(user)
    invalidate_cache_prefix("users")

    return {
        "status": "ok",
        "message": "Avatar synced from WhatsApp successfully.",
        "avatar_url": user.avatar_url,
        "avatar_source": user.avatar_source,
        "user": user.public(),
    }


@router.delete("/profile/avatar")
def reset_profile_avatar(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.avatar_url = "/static/img/logo-mark.png"
    user.avatar_source = "DEFAULT_LOGO"
    db.commit()
    db.refresh(user)
    invalidate_cache_prefix("users")

    return {
        "status": "ok",
        "message": "Avatar reset to SubsidyX default logo fallback.",
        "avatar_url": user.avatar_url,
        "avatar_source": user.avatar_source,
        "user": user.public(),
    }
