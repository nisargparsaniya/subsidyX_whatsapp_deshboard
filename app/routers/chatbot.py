"""Custom chatbot builder API plus the live client-message simulator."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.chatbot_rule import ChatbotFlow
from app.models.contact import HniContact, next_inquiry_id
from app.models.template_campaign import WhatsAppTemplate
from app.services import contact_io, whatsapp_engine
from app.services.security import get_current_user

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"], dependencies=[Depends(get_current_user)])

TriggerType = Literal["KEYWORD_MATCH", "FIRST_INBOUND_WELCOME", "BUTTON_PAYLOAD", "ANY_UNMATCHED"]
ResponseType = Literal["TEXT", "TEMPLATE", "INTERACTIVE_MENU"]


class FlowPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bot_name: str = Field(min_length=2, max_length=160)
    trigger_type: TriggerType = "KEYWORD_MATCH"
    trigger_keywords: str = Field(default="", max_length=255)
    response_type: ResponseType = "TEXT"
    response_content: str = Field(default="", max_length=4000)
    template_id: int | None = None
    auto_assign_sector: str = Field(default="", max_length=60)
    auto_assign_ca: str = Field(default="", max_length=120)
    is_active: bool = True


class FlowUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bot_name: str | None = Field(default=None, min_length=2, max_length=160)
    trigger_type: TriggerType | None = None
    trigger_keywords: str | None = Field(default=None, max_length=255)
    response_type: ResponseType | None = None
    response_content: str | None = Field(default=None, max_length=4000)
    template_id: int | None = None
    auto_assign_sector: str | None = Field(default=None, max_length=60)
    auto_assign_ca: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None


class SimulateInbound(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    contact_id: int | None = None
    whatsapp_number: str | None = Field(default=None, max_length=24)
    client_name: str | None = Field(default=None, max_length=120)


def _get_flow(db: Session, flow_id: int) -> ChatbotFlow:
    flow = db.get(ChatbotFlow, flow_id)
    if flow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chatbot flow not found.")
    return flow


def _validate_flow(data: dict, db: Session) -> None:
    if data.get("trigger_type") in ("KEYWORD_MATCH", "BUTTON_PAYLOAD") and not (data.get("trigger_keywords") or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keyword and button triggers need at least one comma-separated keyword.",
        )
    if data.get("response_type") == "TEMPLATE" and not data.get("template_id"):
        template_name = (data.get("response_content") or "").strip()
        exists = db.scalar(select(WhatsAppTemplate).where(WhatsAppTemplate.template_name == template_name))
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TEMPLATE responses need a template_id (or response_content set to an exact template name).",
            )


@router.get("/flows")
def list_flows(active_only: bool = False, db: Session = Depends(get_db)):
    query = select(ChatbotFlow)
    if active_only:
        query = query.where(ChatbotFlow.is_active.is_(True))
    flows = list(db.scalars(query.order_by(ChatbotFlow.id)).all())
    return {
        "total": len(flows),
        "active": sum(1 for flow in flows if flow.is_active),
        "total_hits": sum(flow.hit_count for flow in flows),
        "flows": [flow.public() for flow in flows],
    }


@router.post("/flows", status_code=status.HTTP_201_CREATED)
def create_flow(payload: FlowPayload, db: Session = Depends(get_db)):
    _validate_flow(payload.model_dump(), db)
    flow = ChatbotFlow(is_mock=whatsapp_engine.mock_active(db), **payload.model_dump())
    db.add(flow)
    db.commit()
    db.refresh(flow)
    return {"message": f"Chatbot flow '{flow.bot_name}' created.", "flow": flow.public()}


@router.patch("/flows/{flow_id}")
def update_flow(flow_id: int, payload: FlowUpdate, db: Session = Depends(get_db)):
    flow = _get_flow(db, flow_id)
    merged = {
        "trigger_type": flow.trigger_type,
        "trigger_keywords": flow.trigger_keywords,
        "response_type": flow.response_type,
        "response_content": flow.response_content,
        "template_id": flow.template_id,
    }
    merged.update(payload.model_dump(exclude_unset=True))
    _validate_flow(merged, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(flow, key, value)
    db.commit()
    db.refresh(flow)
    return {"message": f"Chatbot flow '{flow.bot_name}' updated.", "flow": flow.public()}


@router.post("/flows/{flow_id}/toggle")
def toggle_flow(flow_id: int, db: Session = Depends(get_db)):
    flow = _get_flow(db, flow_id)
    flow.is_active = not flow.is_active
    db.commit()
    db.refresh(flow)
    return {"message": f"'{flow.bot_name}' is now {'active' if flow.is_active else 'paused'}.", "flow": flow.public()}


@router.delete("/flows/{flow_id}")
def delete_flow(flow_id: int, db: Session = Depends(get_db)):
    flow = _get_flow(db, flow_id)
    db.delete(flow)
    db.commit()
    return {"message": f"Chatbot flow '{flow.bot_name}' deleted."}


@router.post("/simulate-inbound")
def simulate_inbound(payload: SimulateInbound, db: Session = Depends(get_db)):
    """Demo the chatbot live: drop in a client message and watch the auto-reply + tagging."""
    contact = db.get(HniContact, payload.contact_id) if payload.contact_id else None

    if contact is None and payload.whatsapp_number:
        phone = contact_io.normalize_phone(payload.whatsapp_number)
        if phone is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid WhatsApp number.")
        contact = db.scalar(select(HniContact).where(HniContact.whatsapp_number == phone))
        if contact is None:
            contact = contact_io.build_contact(
                {"client_name": payload.client_name or "Walk-in WhatsApp Lead", "whatsapp_number": phone},
                is_mock=whatsapp_engine.mock_active(db),
            )
            contact.inquiry_id = next_inquiry_id(db)
            contact.add_tags("New Inbound Lead")
            db.add(contact)
            db.commit()
            db.refresh(contact)

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pick an HNI contact thread or pass a whatsapp_number to simulate an inbound message.",
        )

    return whatsapp_engine.handle_inbound(db, contact, payload.message)
