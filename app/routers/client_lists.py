"""Client Lists and audience categorization router."""

from datetime import datetime
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import ist_now
from app.models.client_list import LIST_CATEGORIES, ClientList, ClientListMembership
from app.models.contact import HniContact
from app.models.user import User
from app.services.security import get_current_user

router = APIRouter(prefix="/api/client-lists", tags=["Client Lists"], dependencies=[Depends(get_current_user)])


class ClientListCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(default="SECTOR_SEGMENT")
    description: str = Field(default="", max_length=255)
    color_hex: str = Field(default="#4080E0", max_length=16)
    filter_rules: dict[str, Any] = Field(default_factory=dict)
    contact_ids: list[int] = Field(default_factory=list)


class ClientListUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = None
    description: str | None = Field(default=None, max_length=255)
    color_hex: str | None = Field(default=None, max_length=16)
    filter_rules: dict[str, Any] | None = None
    is_active: bool | None = None


class ListMembersAdd(BaseModel):
    contact_ids: list[int] = Field(min_length=1)


def _next_list_code(db: Session) -> str:
    max_id = db.scalar(select(func.max(ClientList.id))) or 0
    return f"LST-{max_id + 1:03d}"


def _member_count(db: Session, list_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(ClientListMembership)
        .where(ClientListMembership.list_id == list_id)
    ) or 0


@router.get("")
def list_client_lists(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(ClientList)
    if category and category.strip():
        query = query.where(ClientList.category == category.strip().upper())
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.where(func.lower(ClientList.name).like(term) | func.lower(ClientList.list_code).like(term))

    all_lists = list(db.scalars(query.order_by(ClientList.id.desc())).all())
    total = len(all_lists)
    offset = (page - 1) * page_size
    paged = all_lists[offset : offset + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "lists": [lst.public(member_count=_member_count(db, lst.id)) for lst in paged],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_client_list(
    payload: ClientListCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.scalar(select(ClientList).where(ClientList.name == payload.name.strip()))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A client list named '{payload.name}' already exists.")

    cat = payload.category.strip().upper()
    if cat not in LIST_CATEGORIES:
        cat = "SECTOR_SEGMENT"

    list_code = _next_list_code(db)
    client_list = ClientList(
        list_code=list_code,
        name=payload.name.strip(),
        category=cat,
        description=payload.description.strip(),
        color_hex=payload.color_hex.strip() or "#4080E0",
        filter_rules_json=json.dumps(payload.filter_rules or {}),
        is_active=True,
        created_by=user.username,
        created_at=ist_now(),
    )
    db.add(client_list)
    db.flush()

    # 1. Add explicitly passed contacts
    member_ids = set(payload.contact_ids)

    # 2. Add contacts matching dynamic filter rules (e.g. sector, district, min_subsidy)
    rules = payload.filter_rules or {}
    if rules:
        rule_query = select(HniContact.id).where(HniContact.opt_in_status.is_(True))
        if rules.get("sector"):
            rule_query = rule_query.where(HniContact.sector == rules["sector"])
        if rules.get("district"):
            rule_query = rule_query.where(HniContact.district == rules["district"])
        if rules.get("enterprise_classification"):
            rule_query = rule_query.where(HniContact.enterprise_classification == rules["enterprise_classification"])
        if rules.get("min_subsidy_lakhs"):
            try:
                min_sub = float(rules["min_subsidy_lakhs"])
                rule_query = rule_query.where(HniContact.estimated_subsidy_lakhs >= min_sub)
            except (ValueError, TypeError):
                pass
        matched_ids = db.scalars(rule_query).all()
        member_ids.update(matched_ids)

    # Insert memberships
    for cid in member_ids:
        db.add(ClientListMembership(list_id=client_list.id, contact_id=cid, added_at=ist_now()))

    db.commit()
    db.refresh(client_list)

    return {
        "message": f"Client list '{client_list.name}' created with {len(member_ids)} member(s).",
        "list": client_list.public(member_count=len(member_ids)),
    }


@router.get("/{list_id}")
def get_client_list(list_id: int, db: Session = Depends(get_db)):
    lst = db.get(ClientList, list_id)
    if lst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client list not found.")
    return {"list": lst.public(member_count=_member_count(db, lst.id))}


@router.put("/{list_id}")
def update_client_list(
    list_id: int,
    payload: ClientListUpdate,
    db: Session = Depends(get_db),
):
    lst = db.get(ClientList, list_id)
    if lst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client list not found.")

    if payload.name is not None and payload.name.strip():
        new_name = payload.name.strip()
        if new_name != lst.name:
            dup = db.scalar(select(ClientList).where(ClientList.name == new_name, ClientList.id != list_id))
            if dup is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A list named '{new_name}' already exists.")
            lst.name = new_name

    if payload.category is not None and payload.category.strip().upper() in LIST_CATEGORIES:
        lst.category = payload.category.strip().upper()
    if payload.description is not None:
        lst.description = payload.description.strip()
    if payload.color_hex is not None:
        lst.color_hex = payload.color_hex.strip()
    if payload.filter_rules is not None:
        lst.filter_rules_json = json.dumps(payload.filter_rules)
    if payload.is_active is not None:
        lst.is_active = payload.is_active

    db.commit()
    db.refresh(lst)
    return {"message": f"Client list '{lst.name}' updated.", "list": lst.public(member_count=_member_count(db, lst.id))}


@router.delete("/{list_id}")
def delete_client_list(list_id: int, db: Session = Depends(get_db)):
    lst = db.get(ClientList, list_id)
    if lst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client list not found.")
    name = lst.name
    db.delete(lst)
    db.commit()
    return {"message": f"Client list '{name}' and its memberships have been deleted."}


@router.get("/{list_id}/members")
def get_list_members(
    list_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    lst = db.get(ClientList, list_id)
    if lst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client list not found.")

    memberships = list(
        db.scalars(
            select(ClientListMembership)
            .where(ClientListMembership.list_id == list_id)
            .order_by(ClientListMembership.added_at.desc())
        ).all()
    )
    total = len(memberships)
    offset = (page - 1) * page_size
    paged_memberships = memberships[offset : offset + page_size]
    contact_ids = [m.contact_id for m in paged_memberships]

    contacts = []
    if contact_ids:
        contact_rows = {c.id: c for c in db.scalars(select(HniContact).where(HniContact.id.in_(contact_ids))).all()}
        for m in paged_memberships:
            if m.contact_id in contact_rows:
                c_data = contact_rows[m.contact_id].public()
                c_data["membership_added_at"] = m.added_at.isoformat()
                contacts.append(c_data)

    return {
        "list": lst.public(member_count=total),
        "total": total,
        "page": page,
        "page_size": page_size,
        "members": contacts,
    }


@router.post("/{list_id}/members")
def add_list_members(
    list_id: int,
    payload: ListMembersAdd,
    db: Session = Depends(get_db),
):
    lst = db.get(ClientList, list_id)
    if lst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client list not found.")

    added_count = 0
    for cid in payload.contact_ids:
        existing = db.scalar(
            select(ClientListMembership).where(
                ClientListMembership.list_id == list_id,
                ClientListMembership.contact_id == cid,
            )
        )
        if existing is None:
            contact = db.get(HniContact, cid)
            if contact is not None:
                db.add(ClientListMembership(list_id=list_id, contact_id=cid, added_at=ist_now()))
                added_count += 1

    db.commit()
    return {
        "message": f"Added {added_count} contact(s) to '{lst.name}'.",
        "member_count": _member_count(db, list_id),
    }


@router.delete("/{list_id}/members/{contact_id}")
def remove_list_member(
    list_id: int,
    contact_id: int,
    db: Session = Depends(get_db),
):
    membership = db.scalar(
        select(ClientListMembership).where(
            ClientListMembership.list_id == list_id,
            ClientListMembership.contact_id == contact_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this list.")

    db.delete(membership)
    db.commit()
    return {
        "message": "Contact removed from client list.",
        "member_count": _member_count(db, list_id),
    }
