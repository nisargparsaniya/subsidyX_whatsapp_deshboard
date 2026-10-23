"""HNI contact book API: CRUD, mobile import/export and campaign segments."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact import SECTORS, HniContact, next_inquiry_id
from app.models.whatsapp_message import WhatsAppMessage
from app.services import contact_io, whatsapp_engine
from app.services.security import get_current_user

router = APIRouter(prefix="/api/contacts", tags=["Contacts"], dependencies=[Depends(get_current_user)])

CONTACT_FIELDS = (
    "client_name",
    "company_name",
    "whatsapp_number",
    "email",
    "state",
    "district",
    "taluka",
    "sector",
    "category",
    "enterprise_classification",
    "term_loan_planned",
    "project_type",
    "estimated_subsidy_lakhs",
    "tags",
    "opt_in_status",
    "assigned_ca",
)

MEDIA_TYPES = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "vcf": "text/vcard; charset=utf-8",
}


class ContactCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    client_name: str = Field(min_length=1, max_length=120)
    whatsapp_number: str = Field(min_length=6, max_length=24)
    company_name: str = ""
    email: str = ""
    district: str = ""
    taluka: str = ""
    sector: str = ""
    category: str = ""
    enterprise_classification: str = ""
    term_loan_planned: str = "No"
    project_type: str = "New"
    estimated_subsidy_lakhs: float = 0.0
    tags: str = ""
    opt_in_status: bool = True
    assigned_ca: str = ""
    auto_welcome: bool = False


class ContactUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    client_name: str | None = Field(default=None, min_length=1, max_length=120)
    whatsapp_number: str | None = Field(default=None, min_length=6, max_length=24)
    company_name: str | None = None
    email: str | None = None
    district: str | None = None
    taluka: str | None = None
    sector: str | None = None
    category: str | None = None
    enterprise_classification: str | None = None
    term_loan_planned: str | None = None
    project_type: str | None = None
    estimated_subsidy_lakhs: float | None = None
    tags: str | None = None
    opt_in_status: bool | None = None
    assigned_ca: str | None = None


def _get_contact(db: Session, contact_id: int) -> HniContact:
    contact = db.get(HniContact, contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HNI contact not found.")
    return contact


@router.get("/segments")
def segments(db: Session = Depends(get_db)):
    options = whatsapp_engine.segment_options(db)
    return {"segments": options, "total": len(options)}


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    contacts = list(db.scalars(select(HniContact)).all())
    pipeline = round(sum(contact.estimated_subsidy_lakhs for contact in contacts), 2)

    sectors: dict[str, dict] = {sector: {"sector": sector, "count": 0, "pipeline_lakhs": 0.0} for sector in SECTORS}
    enterprises: dict[str, int] = {}
    districts: dict[str, int] = {}
    cas: dict[str, int] = {}
    for contact in contacts:
        bucket = sectors.setdefault(
            contact.sector or "Unassigned", {"sector": contact.sector or "Unassigned", "count": 0, "pipeline_lakhs": 0.0}
        )
        bucket["count"] += 1
        bucket["pipeline_lakhs"] = round(bucket["pipeline_lakhs"] + contact.estimated_subsidy_lakhs, 2)
        if contact.enterprise_classification:
            enterprises[contact.enterprise_classification] = enterprises.get(contact.enterprise_classification, 0) + 1
        if contact.district:
            districts[contact.district] = districts.get(contact.district, 0) + 1
        if contact.assigned_ca:
            cas[contact.assigned_ca] = cas.get(contact.assigned_ca, 0) + 1

    return {
        "total_contacts": len(contacts),
        "opted_in": sum(1 for contact in contacts if contact.opt_in_status),
        "pipeline_lakhs": pipeline,
        "pipeline_crores": round(pipeline / 100, 2),
        "by_sector": sorted(sectors.values(), key=lambda row: row["pipeline_lakhs"], reverse=True),
        "by_enterprise": [{"classification": key, "count": value} for key, value in sorted(enterprises.items())],
        "by_district": [
            {"district": key, "count": value}
            for key, value in sorted(districts.items(), key=lambda item: item[1], reverse=True)
        ],
        "by_ca": [{"assigned_ca": key, "count": value} for key, value in sorted(cas.items(), key=lambda item: item[1], reverse=True)],
    }


@router.post("/import")
async def import_contacts(
    file: UploadFile = File(...),
    auto_welcome: bool = Form(default=False),
    db: Session = Depends(get_db),
):
    data = await file.read()
    try:
        records = contact_io.parse_upload(file.filename or "", data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not records:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No readable contact rows found in this file.")

    result = contact_io.import_records(
        db,
        records,
        is_mock=whatsapp_engine.mock_active(db),
        auto_welcome=auto_welcome,
    )
    result["filename"] = file.filename
    result["auto_welcome"] = auto_welcome
    result["message"] = (
        f"{result['created']} HNI contact(s) imported · "
        f"{result['duplicates']} duplicate phone number(s) skipped · "
        f"{result['invalid']} invalid row(s)."
    )
    return result


@router.get("/export")
def export_contacts(format: str = Query(default="csv", pattern="^(csv|xlsx|vcf)$"), db: Session = Depends(get_db)):
    contacts = list(db.scalars(select(HniContact).order_by(HniContact.client_name)).all())
    if format == "xlsx":
        content: bytes | str = contact_io.export_xlsx(contacts)
    elif format == "vcf":
        content = contact_io.export_vcf(contacts)
    else:
        content = contact_io.export_csv(contacts)
    return Response(
        content=content,
        media_type=MEDIA_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{contact_io.export_filename(format)}"'},
    )


@router.get("/sample-template")
def sample_template(format: str = Query(default="csv", pattern="^(csv|vcf)$")):
    content = contact_io.sample_csv() if format == "csv" else contact_io.sample_vcf()
    return Response(
        content=content,
        media_type=MEDIA_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="subsidyx_sample_contacts.{format}"'},
    )


@router.get("")
def list_contacts(
    q: str | None = Query(default=None, max_length=120),
    sector: str | None = None,
    district: str | None = None,
    enterprise_classification: str | None = None,
    tag: str | None = None,
    opt_in: bool | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = select(HniContact)
    if q:
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                HniContact.client_name.ilike(search),
                HniContact.company_name.ilike(search),
                HniContact.whatsapp_number.ilike(search),
                HniContact.inquiry_id.ilike(search),
                HniContact.email.ilike(search),
                HniContact.tags.ilike(search),
            )
        )
    if sector:
        query = query.where(HniContact.sector == sector)
    if district:
        query = query.where(HniContact.district == district)
    if enterprise_classification:
        query = query.where(HniContact.enterprise_classification == enterprise_classification)
    if tag:
        query = query.where(HniContact.tags.ilike(f"%{tag}%"))
    if opt_in is not None:
        query = query.where(HniContact.opt_in_status.is_(opt_in))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    contacts = list(db.scalars(query.order_by(HniContact.id.desc()).offset(offset).limit(limit)).all())
    return {"total": total, "limit": limit, "offset": offset, "contacts": [contact.public() for contact in contacts]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactCreate, db: Session = Depends(get_db)):
    record = payload.model_dump(exclude={"auto_welcome"})
    try:
        contact = contact_io.build_contact(record, is_mock=whatsapp_engine.mock_active(db))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    duplicate = db.scalar(select(HniContact).where(HniContact.whatsapp_number == contact.whatsapp_number))
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{contact.whatsapp_number} already belongs to {duplicate.client_name} ({duplicate.inquiry_id}).",
        )

    contact.inquiry_id = next_inquiry_id(db)
    db.add(contact)
    db.commit()
    db.refresh(contact)

    welcome_sent = whatsapp_engine.send_welcome(db, [contact]) if payload.auto_welcome else 0
    return {"message": f"{contact.client_name} added as {contact.inquiry_id}.", "contact": contact.public(), "welcome_sent": welcome_sent}


@router.get("/{contact_id}")
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    return {"contact": _get_contact(db, contact_id).public()}


@router.patch("/{contact_id}")
def update_contact(contact_id: int, payload: ContactUpdate, db: Session = Depends(get_db)):
    contact = _get_contact(db, contact_id)
    merged = contact_io.record_for(contact)
    merged.update({key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None})

    try:
        validated = contact_io.build_contact(merged, is_mock=contact.is_mock)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if validated.whatsapp_number != contact.whatsapp_number:
        duplicate = db.scalar(select(HniContact).where(HniContact.whatsapp_number == validated.whatsapp_number))
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That WhatsApp number belongs to another HNI contact.")

    for field in CONTACT_FIELDS:
        setattr(contact, field, getattr(validated, field))
    db.commit()
    db.refresh(contact)
    return {"message": f"{contact.client_name} updated.", "contact": contact.public()}


@router.delete("/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = _get_contact(db, contact_id)
    for message in db.scalars(select(WhatsAppMessage).where(WhatsAppMessage.contact_id == contact.id)).all():
        db.delete(message)
    db.delete(contact)
    db.commit()
    return {"message": f"{contact.client_name} ({contact.inquiry_id}) removed from the HNI contact book."}
