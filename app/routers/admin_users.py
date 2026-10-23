"""Super Admin vault: issue/revoke employee credentials and inspect login IP audit logs."""

import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import LoginAuditLog
from app.models.user import ADMIN, EMPLOYEE, User
from app.services.security import hash_password, require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    designation: str = Field(default="Subsidy Relationship Executive", max_length=160)
    username: str | None = Field(default=None, min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str | None = Field(default=None, min_length=8, max_length=128)


def _slug(full_name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", full_name.lower()).strip("_")
    return f"emp_{slug}"[:64] if slug else f"emp_{secrets.token_hex(3)}"


def _generate_password() -> str:
    return f"Subsidy@{secrets.randbelow(9000) + 1000}"


@router.get("/employees")
def list_employees(db: Session = Depends(get_db)):
    employees = db.scalars(select(User).where(User.role == EMPLOYEE).order_by(User.created_at.desc())).all()
    return {"total": len(employees), "employees": [employee.public() for employee in employees]}


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    username = (payload.username or _slug(payload.full_name)).strip().lower()
    if db.scalar(select(User).where(User.username == username)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Employee ID '{username}' already exists.")

    password = payload.password or _generate_password()
    employee = User(
        username=username,
        full_name=payload.full_name.strip(),
        designation=payload.designation.strip(),
        role=EMPLOYEE,
        password_hash=hash_password(password),
        created_by=admin.username,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return {
        "message": f"Credentials generated for {employee.full_name}.",
        "employee": employee.public(),
        "credentials": {"username": username, "password": password},
    }


@router.patch("/employees/{employee_id}/access")
def toggle_employee_access(employee_id: int, db: Session = Depends(get_db)):
    employee = db.get(User, employee_id)
    if employee is None or employee.role == ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    employee.is_active = not employee.is_active
    db.commit()
    action = "restored" if employee.is_active else "revoked"
    return {"message": f"{employee.username} access {action}.", "employee": employee.public()}


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.get(User, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if employee.role == ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super Admin accounts cannot be deleted.")
    db.delete(employee)
    db.commit()
    return {"message": f"Employee {employee.username} revoked and deleted."}


@router.get("/audit-logs")
def audit_logs(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db)):
    logs = db.scalars(select(LoginAuditLog).order_by(LoginAuditLog.id.desc()).limit(limit)).all()
    return {"total": len(logs), "logs": [log.public() for log in logs]}
