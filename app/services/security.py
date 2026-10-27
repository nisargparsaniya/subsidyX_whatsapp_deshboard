"""Password hashing, dual JWT + stateful session tokens, client-IP extraction and RBAC guards."""

from datetime import datetime, timedelta, timezone
import secrets

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.audit_log import IST, ist_now
from app.models.user import ADMIN, User
from app.models.user_session import UserSession

AUTH_COOKIE = "subsidyx_token"
SESSION_COOKIE = "sx_session_token"
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_access_token(user: User, jti: str | None = None, session_token: str | None = None) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user.username,
        "sub_id": user.id,
        "phone": getattr(user, "phone_number", ""),
        "role": user.role,
        "exp": expires,
    }
    if jti:
        payload["jti"] = jti
    if session_token:
        payload["session_token"] = session_token
    return jwt.encode(payload, settings.SECRET_KEY, JWT_ALGORITHM)


def issue_dual_tokens(
    db: Session,
    user: User,
    ip_address: str = "",
    user_agent: str = "",
) -> tuple[str, str, UserSession]:
    """Issues both a JWT access token and a stateful UserSession stored in PostgreSQL."""
    jti = secrets.token_hex(16)
    session_token = secrets.token_urlsafe(48)
    expires_at = ist_now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    user_session = UserSession(
        user_id=user.id,
        session_token=session_token,
        jwt_jti=jti,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else "",
        is_active=True,
        created_at_ist=ist_now(),
        expires_at_ist=expires_at,
    )
    db.add(user_session)
    db.commit()
    db.refresh(user_session)

    jwt_token = create_access_token(user, jti=jti, session_token=session_token)
    return jwt_token, session_token, user_session


def revoke_user_sessions(db: Session, user_id: int, revoked_by: str = "ADMIN") -> int:
    """Instantly revokes all active sessions for a user, kicking them out on their next action."""
    now = ist_now()
    sessions = db.scalars(
        select(UserSession).where(UserSession.user_id == user_id, UserSession.is_active.is_(True))
    ).all()
    count = len(sessions)
    for s in sessions:
        s.is_active = False
        s.revoked_at_ist = now
        s.revoked_by = revoked_by
    db.commit()
    return count


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _token_from(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return request.cookies.get(AUTH_COOKIE)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired or invalid. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = _token_from(request)
    if not token:
        raise unauthorized
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise unauthorized from None

    user: User | None = None
    sub_id = payload.get("sub_id")
    if sub_id is not None:
        try:
            user = db.get(User, int(sub_id))
        except (ValueError, TypeError):
            user = None

    if user is None:
        username = payload.get("sub")
        if username:
            user = db.scalar(select(User).where(User.username == username))

    if user is None or not user.is_active:
        raise unauthorized

    # Stateful session check
    jti = payload.get("jti")
    sess_token = request.cookies.get(SESSION_COOKIE) or request.headers.get("x-session-token")
    if jti:
        session_row = db.scalar(select(UserSession).where(UserSession.jwt_jti == jti))
        if session_row is None or not session_row.is_active:
            raise unauthorized
        if session_row.expires_at_ist:
            exp = session_row.expires_at_ist
            if exp.tzinfo is not None:
                exp = exp.astimezone(IST).replace(tzinfo=None)
            if ist_now() > exp:
                session_row.is_active = False
                db.commit()
                raise unauthorized
    elif sess_token:
        session_row = db.scalar(select(UserSession).where(UserSession.session_token == sess_token))
        if session_row is None or not session_row.is_active:
            raise unauthorized
        if session_row.expires_at_ist:
            exp = session_row.expires_at_ist
            if exp.tzinfo is not None:
                exp = exp.astimezone(IST).replace(tzinfo=None)
            if ist_now() > exp:
                session_row.is_active = False
                db.commit()
                raise unauthorized

    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required for this action.")
    return user
