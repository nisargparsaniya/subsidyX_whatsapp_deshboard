"""Omnichannel lead management service — ingestion, validation, round-robin, and conversion."""

import re
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit_log import ist_now
from app.models.client_list import ClientListMembership
from app.models.contact import HniContact, next_inquiry_id
from app.models.leads_integration import OmniLead, SocialCampaignPost
from app.models.user import EMPLOYEE, User


def normalize_indian_phone(raw_phone: str, fallback_simulation: bool = False) -> str:
    """Validates and normalizes phone to strict E.164 +91[6-9]XXXXXXXXX format with simulation fallback."""
    digits = "".join(filter(str.isdigit, str(raw_phone or "")))
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) == 10 and digits[0] in "6789":
        return f"+91{digits}"
    if fallback_simulation:
        import secrets
        rnd = secrets.randbelow(900000000) + 100000000
        return f"+919{rnd}"
    raise ValueError(f"Invalid Indian mobile number: '{raw_phone}'. Must be a 10-digit number starting with 6-9.")


def next_lead_code(db: Session) -> str:
    """Generates consecutive LD-2001 style codes."""
    max_id = db.scalar(select(func.max(OmniLead.id))) or 0
    return f"LD-{2000 + max_id + 1}"


def next_post_code(db: Session) -> str:
    """Generates consecutive SOC-101 style codes."""
    max_id = db.scalar(select(func.max(SocialCampaignPost.id))) or 0
    return f"SOC-{100 + max_id + 1}"


def assign_advisor_round_robin(db: Session) -> str:
    """Assigns an advisor with the lowest current active lead workload."""
    users = list(db.scalars(select(User).where(User.is_active.is_(True)).order_by(User.id)).all())
    if not users:
        return "Unassigned"

    # Count active leads per advisor
    lead_counts: dict[str, int] = {}
    for user in users:
        count = db.scalar(
            select(func.count())
            .select_from(OmniLead)
            .where(OmniLead.assigned_to_username == user.username, OmniLead.lead_stage != "CONVERTED")
        ) or 0
        lead_counts[user.username] = count

    # Pick user with minimum leads
    best_advisor = min(lead_counts.keys(), key=lambda u: lead_counts[u])
    return best_advisor


def convert_lead_to_contact(
    db: Session,
    lead: OmniLead,
    target_list_id: int | None = None,
) -> HniContact:
    """1-Click conversion of an OmniLead to an active HNI Client and assigns to Client List."""
    normalized_phone = normalize_indian_phone(lead.phone_number)

    # Check for existing contact
    contact = db.scalar(select(HniContact).where(HniContact.whatsapp_number == normalized_phone))
    if contact is None:
        contact = HniContact(
            inquiry_id=next_inquiry_id(db),
            client_name=lead.full_name.strip(),
            company_name=(lead.company_name or "").strip(),
            whatsapp_number=normalized_phone,
            email=(lead.email or "").strip(),
            state=lead.state or "Gujarat",
            district=lead.district or "",
            sector=lead.sector or "",
            estimated_subsidy_lakhs=lead.estimated_subsidy_lakhs or 0.0,
            tags=f"Lead:{lead.source_platform}",
            opt_in_status=True,
            assigned_ca=lead.assigned_to_username or "",
            is_mock=False,
            created_at=ist_now(),
        )
        db.add(contact)
        db.flush()
    else:
        # Merge lead tags
        contact.add_tags(f"Lead:{lead.source_platform}")
        if lead.company_name and not contact.company_name:
            contact.company_name = lead.company_name

    # Assign to ClientList if requested
    list_id = target_list_id or lead.target_list_id
    if list_id:
        existing_membership = db.scalar(
            select(ClientListMembership).where(
                ClientListMembership.list_id == list_id,
                ClientListMembership.contact_id == contact.id,
            )
        )
        if existing_membership is None:
            db.add(ClientListMembership(list_id=list_id, contact_id=contact.id, added_at=ist_now()))

    # Update lead status
    lead.lead_stage = "CONVERTED"
    lead.converted_contact_id = contact.id
    lead.updated_at_ist = ist_now()

    db.commit()
    db.refresh(contact)
    return contact
