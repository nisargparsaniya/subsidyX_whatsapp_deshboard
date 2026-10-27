"""Super Admin vault: issue/revoke staff credentials, edit user profiles and inspect audit logs."""

import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.audit_log import CREDENTIALS_UPDATED, LoginAuditLog, ist_now
from app.models.contact import HniContact
from app.models.user import ADMIN, EMPLOYEE, User
from app.services.cache import invalidate_cache_prefix
from app.services.lead_service import normalize_indian_phone
from app.services.security import AUTH_COOKIE, client_ip, create_access_token, hash_password, require_admin, revoke_user_sessions

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str = Field(min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    designation: str = Field(default="Subsidy Relationship Executive", max_length=160)
    role: str = Field(default=EMPLOYEE)
    username: str | None = Field(default=None, min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str | None = Field(default=None, min_length=6, max_length=128)


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone_number: str | None = Field(default=None, min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    designation: str | None = Field(default=None, max_length=160)
    role: str | None = Field(default=None)
    username: str | None = Field(default=None, min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str | None = Field(default=None, min_length=6, max_length=128)
    is_active: bool | None = None


def _slug(full_name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", full_name.lower()).strip("_")
    return f"emp_{slug}"[:64] if slug else f"emp_{secrets.token_hex(3)}"


def _generate_password() -> str:
    return f"Subsidy@{secrets.randbelow(9000) + 1000}"


@router.get("/employees")
def list_employees(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    role: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(User)
    if role and role.upper() in (ADMIN, EMPLOYEE):
        query = query.where(User.role == role.upper())
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.where(
            func.lower(User.full_name).like(term)
            | func.lower(User.username).like(term)
            | User.phone_number.like(term)
            | func.lower(User.designation).like(term)
        )

    all_users = list(db.scalars(query.order_by(User.id.desc())).all())
    total = len(all_users)
    offset = (page - 1) * page_size
    paged = all_users[offset : offset + page_size]
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "employees": [employee.public() for employee in paged],
    }


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        norm_phone = normalize_indian_phone(payload.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Phone uniqueness check
    if db.scalar(select(User).where(User.phone_number == norm_phone)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Mobile number '{norm_phone}' is already registered to a staff account.")

    if payload.username:
        username = payload.username.strip().lower()
        if db.scalar(select(User).where(User.username == username)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Employee ID '{username}' already exists.")
    else:
        base_username = _slug(payload.full_name).strip().lower()
        username = base_username
        counter = 1
        while db.scalar(select(User).where(User.username == username)):
            counter += 1
            username = f"{base_username}_{counter}"

    user_role = ADMIN if payload.role and payload.role.upper() == ADMIN else EMPLOYEE
    password = payload.password or _generate_password()

    employee = User(
        username=username,
        phone_number=norm_phone,
        email=payload.email.strip() if payload.email and payload.email.strip() else None,
        full_name=payload.full_name.strip(),
        designation=payload.designation.strip(),
        role=user_role,
        password_hash=hash_password(password),
        created_by=admin.username,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    invalidate_cache_prefix("users")

    return {
        "message": f"Account generated for {employee.full_name} ({employee.role}).",
        "employee": employee.public(),
        "credentials": {"username": username, "password": password, "phone": norm_phone},
    }


@router.put("/employees/{user_id}")
@router.patch("/employees/{user_id}")
@router.patch("/users/{user_id}/credentials")
def update_user_credentials(
    user_id: int,
    payload: EmployeeUpdate,
    request: Request,
    response: Response,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target_user = db.get(User, user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    old_username = target_user.username
    old_full_name = target_user.full_name
    username_changed = False

    if payload.phone_number is not None and payload.phone_number.strip():
        try:
            norm_phone = normalize_indian_phone(payload.phone_number)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        if norm_phone != target_user.phone_number:
            existing_phone = db.scalar(select(User).where(User.phone_number == norm_phone, User.id != target_user.id))
            if existing_phone is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Mobile number '{norm_phone}' is already registered to another user.")
            target_user.phone_number = norm_phone

    if payload.email is not None:
        target_user.email = payload.email.strip() if payload.email.strip() else None

    if payload.username is not None:
        new_username = payload.username.strip().lower()
        if new_username != old_username:
            existing = db.scalar(select(User).where(User.username == new_username, User.id != target_user.id))
            if existing is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"User ID '{new_username}' already exists.")
            target_user.username = new_username
            username_changed = True

    if payload.full_name is not None and payload.full_name.strip():
        target_user.full_name = payload.full_name.strip()

    if payload.designation is not None:
        target_user.designation = payload.designation.strip()

    if payload.role is not None and payload.role.upper() in (ADMIN, EMPLOYEE):
        target_user.role = payload.role.upper()

    if payload.is_active is not None:
        target_user.is_active = payload.is_active

    if payload.password is not None and payload.password.strip():
        target_user.password_hash = hash_password(payload.password.strip())

    if username_changed:
        db.execute(update(HniContact).where(HniContact.assigned_ca == old_username).values(assigned_ca=target_user.username))
    if payload.full_name is not None and target_user.full_name != old_full_name:
        db.execute(update(HniContact).where(HniContact.assigned_ca == old_full_name).values(assigned_ca=target_user.full_name))

    db.commit()
    db.refresh(target_user)

    invalidate_cache_prefix("users")
    invalidate_cache_prefix("contacts")

    new_token = None
    if target_user.id == admin.id:
        new_token = create_access_token(target_user)
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
            username_attempted=target_user.username,
            full_name=target_user.full_name,
            role_detected=target_user.role,
            ip_address=client_ip(request),
            user_agent=request.headers.get("user-agent", "")[:512],
            status=CREDENTIALS_UPDATED,
            timestamp_ist=ist_now(),
        )
    )
    db.commit()

    return {
        "message": f"User '{target_user.username}' details updated successfully.",
        "employee": target_user.public(),
        "user": target_user.public(),
        "access_token": new_token,
    }


@router.patch("/employees/{employee_id}/revoke")
def revoke_employee_credentials(employee_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    employee = db.get(User, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if employee.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot revoke your own active admin account.")
    if employee.role == ADMIN and employee.username in {"nisarg", "gajendra", "abhishek"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary Super Admin accounts cannot be revoked.")

    employee.is_active = False
    revoked_count = revoke_user_sessions(db, employee.id, revoked_by=admin.username)
    db.commit()
    invalidate_cache_prefix("users")
    return {
        "status": "ok",
        "message": f"Credentials for {employee.full_name} ({employee.username}) revoked immediately ({revoked_count} active sessions terminated).",
        "employee": employee.public(),
    }


@router.patch("/employees/{employee_id}/toggle-status")
@router.patch("/employees/{employee_id}/access")
def toggle_employee_access(employee_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    employee = db.get(User, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if employee.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own active admin account.")

    employee.is_active = not employee.is_active
    if not employee.is_active:
        revoke_user_sessions(db, employee.id, revoked_by=admin.username)
    db.commit()
    invalidate_cache_prefix("users")
    action = "activated" if employee.is_active else "deactivated"
    return {"message": f"Account for {employee.full_name} has been {action}.", "employee": employee.public()}


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    employee = db.get(User, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if employee.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own active admin account.")
    if employee.role == ADMIN and employee.username in {"nisarg", "gajendra", "abhishek"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary Super Admin accounts cannot be deleted.")

    username = employee.username
    revoke_user_sessions(db, employee.id, revoked_by=admin.username)
    db.delete(employee)
    db.commit()
    invalidate_cache_prefix("users")
    return {"message": f"User account '{username}' has been removed from the platform."}


@router.get("/audit-logs")
def audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=500),
    limit: int | None = Query(default=None, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = select(LoginAuditLog)
    total = len(db.scalars(query).all())
    effective_size = limit if limit is not None else page_size
    offset = (page - 1) * effective_size
    logs = list(db.scalars(query.order_by(LoginAuditLog.id.desc()).offset(offset).limit(effective_size)).all())
    return {
        "total": total,
        "page": page,
        "page_size": effective_size,
        "logs": [log.public() for log in logs],
    }
