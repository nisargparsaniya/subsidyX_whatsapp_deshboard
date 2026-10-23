"""Password hashing, HttpOnly JWT sessions, client-IP extraction and RBAC guards."""

from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import ADMIN, User

AUTH_COOKIE = "subsidyx_token"
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:  # malformed hash in DB
        return False


def create_access_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user.username, "role": user.role, "exp": expires}, settings.SECRET_KEY, JWT_ALGORITHM)


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
    user = db.scalar(select(User).where(User.username == payload.get("sub")))
    if user is None or not user.is_active:
        raise unauthorized
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required for this action.")
    return user
