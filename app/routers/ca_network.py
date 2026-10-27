"""CA & Associates Network Router — Dedicated Management for CAs and Partners."""

import json
from pathlib import Path
import secrets
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ca_associate import CAAssociateProfile
from app.models.user import User
from app.services.contact_io import normalize_phone
from app.services.security import get_current_user

router = APIRouter(prefix="/api/ca-network", tags=["CA Network"], dependencies=[Depends(get_current_user)])

AVATARS_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads" / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)


class CAAssociateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ca_code: str | None = None
    full_name: str = Field(..., min_length=2, max_length=120)
    firm_name: str = Field(default="", max_length=160)
    icai_membership_no: str = Field(default="", max_length=40)
    phone_number: str = Field(..., min_length=10, max_length=20)
    email: str = Field(default="", max_length=120)
    city_district: str = Field(default="", max_length=80)
    specialization: str = Field(default="Project Finance & Term Loan", max_length=120)
    associates: list[dict] = Field(default_factory=list)
    referred_industrialists_count: int = Field(default=0, ge=0)
    avatar_url: str = Field(default="/static/img/logo-mark.png")
    is_active: bool = True


class CAAssociateUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ca_code: str | None = None
    full_name: str | None = None
    firm_name: str | None = None
    icai_membership_no: str | None = None
    phone_number: str | None = None
    email: str | None = None
    city_district: str | None = None
    specialization: str | None = None
    associates: list[dict] | None = None
    referred_industrialists_count: int | None = None
    avatar_url: str | None = None
    is_active: bool | None = None


def _generate_ca_code(db: Session) -> str:
    count = db.scalar(select(func.count(CAAssociateProfile.id))) or 0
    return f"CA-{101 + count}"


@router.get("")
def list_ca_network(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(CAAssociateProfile)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                CAAssociateProfile.full_name.ilike(pattern),
                CAAssociateProfile.firm_name.ilike(pattern),
                CAAssociateProfile.phone_number.ilike(pattern),
                CAAssociateProfile.ca_code.ilike(pattern),
                CAAssociateProfile.city_district.ilike(pattern),
                CAAssociateProfile.icai_membership_no.ilike(pattern),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (
        db.scalars(
            stmt.order_by(CAAssociateProfile.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .all()
    )
    pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": [r.public() for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/{ca_id}")
def get_ca_profile(ca_id: int, db: Session = Depends(get_db)):
    profile = db.get(CAAssociateProfile, ca_id)
    if not profile:
        raise HTTPException(status_code=404, detail="CA Associate profile not found")
    return profile.public()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_ca_profile(payload: CAAssociateIn, db: Session = Depends(get_db)):
    clean_phone = normalize_phone(payload.phone_number)
    if not clean_phone:
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number")

    existing = db.scalar(select(CAAssociateProfile).where(CAAssociateProfile.phone_number == clean_phone))
    if existing:
        raise HTTPException(status_code=409, detail="A CA profile with this mobile number already exists")

    ca_code = (payload.ca_code or "").strip() or _generate_ca_code(db)
    existing_code = db.scalar(select(CAAssociateProfile).where(CAAssociateProfile.ca_code == ca_code))
    if existing_code:
        ca_code = f"{ca_code}-{secrets.randbelow(1000)}"

    profile = CAAssociateProfile(
        ca_code=ca_code,
        full_name=payload.full_name.strip(),
        firm_name=(payload.firm_name or "").strip(),
        icai_membership_no=(payload.icai_membership_no or "").strip(),
        phone_number=clean_phone,
        email=(payload.email or "").strip(),
        city_district=(payload.city_district or "").strip(),
        specialization=payload.specialization or "Project Finance & Term Loan",
        associates_list_json=json.dumps(payload.associates or []),
        referred_industrialists_count=payload.referred_industrialists_count or 0,
        avatar_url=payload.avatar_url or "/static/img/logo-mark.png",
        is_active=payload.is_active,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile.public()


@router.put("/{ca_id}")
def update_ca_profile(ca_id: int, payload: CAAssociateUpdate, db: Session = Depends(get_db)):
    profile = db.get(CAAssociateProfile, ca_id)
    if not profile:
        raise HTTPException(status_code=404, detail="CA Associate profile not found")

    data = payload.model_dump(exclude_unset=True)
    if "phone_number" in data and data["phone_number"]:
        clean_phone = normalize_phone(data["phone_number"])
        if not clean_phone:
            raise HTTPException(status_code=400, detail="Invalid phone number")
        existing = db.scalar(
            select(CAAssociateProfile).where(
                CAAssociateProfile.phone_number == clean_phone,
                CAAssociateProfile.id != ca_id,
            )
        )
        if existing:
            raise HTTPException(status_code=409, detail="Another profile with this phone exists")
        profile.phone_number = clean_phone

    if "associates" in data and data["associates"] is not None:
        profile.associates_list_json = json.dumps(data["associates"])

    for field in ("full_name", "firm_name", "icai_membership_no", "email", "city_district", "specialization", "referred_industrialists_count", "avatar_url", "is_active", "ca_code"):
        if field in data and data[field] is not None:
            setattr(profile, field, data[field])

    db.commit()
    db.refresh(profile)
    return profile.public()


@router.delete("/{ca_id}")
def delete_ca_profile(ca_id: int, db: Session = Depends(get_db)):
    profile = db.get(CAAssociateProfile, ca_id)
    if not profile:
        raise HTTPException(status_code=404, detail="CA Associate profile not found")
    db.delete(profile)
    db.commit()
    return {"status": "ok", "deleted_ca_id": ca_id}


@router.post("/{ca_id}/avatar")
async def upload_ca_avatar(ca_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    profile = db.get(CAAssociateProfile, ca_id)
    if not profile:
        raise HTTPException(status_code=404, detail="CA profile not found")

    magic = await file.read(512)
    await file.seek(0)
    is_valid_image = (
        magic.startswith(b"\x89PNG\r\n\x1a\n")
        or magic[:3] == b"\xff\xd8\xff"
        or magic.startswith(b"RIFF") and b"WEBP" in magic[:16]
    )
    if not is_valid_image:
        raise HTTPException(status_code=400, detail="Only valid PNG, JPG, or WEBP images are allowed")

    suffix = Path(file.filename or "").suffix.lower() or ".png"
    safe_name = f"ca_{ca_id}_{secrets.token_hex(6)}{suffix}"
    dest = AVATARS_DIR / safe_name
    content = await file.read()
    dest.write_bytes(content)

    avatar_url = f"/static/uploads/avatars/{safe_name}"
    profile.avatar_url = avatar_url
    db.commit()
    return {"status": "ok", "avatar_url": avatar_url}


@router.delete("/{ca_id}/avatar")
def reset_ca_avatar(ca_id: int, db: Session = Depends(get_db)):
    profile = db.get(CAAssociateProfile, ca_id)
    if not profile:
        raise HTTPException(status_code=404, detail="CA profile not found")
    profile.avatar_url = "/static/img/logo-mark.png"
    db.commit()
    return {"status": "ok", "avatar_url": "/static/img/logo-mark.png"}
