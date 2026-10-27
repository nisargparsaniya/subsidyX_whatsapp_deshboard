"""Deterministic Rules-First + AI Draft-for-Staff-Approval Adapter.

Enterprise compliance rule for CA Abhishek Jain's firm & HNI clients:
- AI is NEVER allowed to auto-send free-form unapproved messages directly to clients.
- All AI suggestions are strictly generated as DRAFTS for internal staff/CA review,
  editing, and explicit one-click approval before transmission.
- Supports OpenCode free models and OpenAI-compatible endpoints with graceful offline fallback.
"""

import json
import logging
from typing import Any
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.audit_log import ist_now
from app.models.contact import HniContact
from app.models.system_setting import (
    AI_API_BASE_KEY,
    AI_API_KEY_KEY,
    AI_ENABLED_KEY,
    AI_MODEL_KEY,
    AI_PROVIDER_KEY,
    get_setting,
)

logger = logging.getLogger(__name__)


def is_ai_enabled(db: Session | None = None) -> bool:
    if db is not None:
        db_val = get_setting(db, AI_ENABLED_KEY)
        if db_val is not None:
            return db_val.lower() in ("true", "1", "yes")
    return bool(settings.AI_ENABLED)


def _get_ai_config(db: Session | None = None) -> dict[str, str]:
    provider = (get_setting(db, AI_PROVIDER_KEY) if db else None) or settings.AI_PROVIDER or "opencode"
    api_base = (get_setting(db, AI_API_BASE_KEY) if db else None) or settings.AI_API_BASE or "https://api.opencode.ai/v1"
    api_key = (get_setting(db, AI_API_KEY_KEY) if db else None) or settings.AI_API_KEY or ""
    model = (get_setting(db, AI_MODEL_KEY) if db else None) or settings.AI_MODEL or "free"
    return {
        "provider": provider,
        "api_base": api_base.rstrip("/"),
        "api_key": api_key,
        "model": model,
    }


def generate_staff_draft(
    contact: HniContact,
    inbound_text: str,
    conversation_history: list[dict[str, Any]] | None = None,
    db: Session | None = None,
) -> dict[str, Any]:
    """Generate an optional draft reply for staff review & approval.

    CRITICAL: This function NEVER sends a WhatsApp message. It returns a candidate
    draft that must be displayed to staff in the dashboard for manual approval.
    """
    conf = _get_ai_config(db)
    client_name = contact.client_name or "Client"
    company = contact.company_name or "your enterprise"
    sector = contact.sector or "Industrial"
    subsidy = f"₹{contact.estimated_subsidy_lakhs:.2f} Lakhs" if contact.estimated_subsidy_lakhs else "eligible capital subsidy"
    ca_name = contact.assigned_ca or "CA Abhishek Jain"
    district = contact.district or "Gujarat"

    # Attempt calling configured endpoint if API key or base is provided
    if is_ai_enabled(db) and conf["api_base"]:
        try:
            system_prompt = (
                f"You are an executive subsidy drafting assistant for SubsidyX and {ca_name}. "
                f"Draft a polite, concise, professional WhatsApp reply in English to the HNI client.\n"
                f"Client: {client_name} ({company})\n"
                f"Sector: {sector}, District: {district}, Estimated Subsidy: {subsidy}\n"
                f"Inquiry ID: {contact.inquiry_id}\n"
                "Rules:\n"
                "1. Keep it under 100 words.\n"
                "2. Do NOT use emojis.\n"
                "3. Offer specific next steps (e.g. document review or CA consultation).\n"
                "4. Draft for staff approval."
            )
            headers = {"Content-Type": "application/json"}
            if conf["api_key"]:
                headers["Authorization"] = f"Bearer {conf['api_key']}"

            payload = {
                "model": conf["model"],
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": inbound_text},
                ],
                "temperature": 0.3,
                "max_tokens": 250,
            }

            with httpx.Client(timeout=4.0) as client:
                resp = client.post(f"{conf['api_base']}/chat/completions", json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    ai_text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                    if ai_text:
                        return {
                            "is_ai_draft": True,
                            "requires_staff_approval": True,
                            "provider": conf["provider"],
                            "model": conf["model"],
                            "draft_body": ai_text,
                            "suggested_ca": ca_name,
                            "generated_at": ist_now().isoformat(),
                        }
        except Exception as exc:
            logger.info("AI remote endpoint unavailable (%s); using deterministic rules-first advisory draft.", exc)

    # Deterministic fallback draft (guaranteed, fast, zero external latency or failure)
    fallback_text = (
        f"Dear {client_name},\n\n"
        f"Thank you for contacting SubsidyX regarding {company}. Our CA desk led by {ca_name} "
        f"is evaluating the {sector} industrial incentives for your {district} unit, "
        f"with an estimated subsidy of {subsidy}.\n\n"
        f"Reference: {contact.inquiry_id}\n"
        "We are ready to review your project cost statement and term loan details. "
        "Would you like us to schedule an appraisal call with our Principal CA today?"
    )

    return {
        "is_ai_draft": True,
        "requires_staff_approval": True,
        "provider": "deterministic_advisory_engine",
        "model": "rules_first_fallback",
        "draft_body": fallback_text,
        "suggested_ca": ca_name,
        "generated_at": ist_now().isoformat(),
    }
