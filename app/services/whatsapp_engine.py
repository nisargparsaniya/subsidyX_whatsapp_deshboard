"""Template rendering, mock delivery simulation and chatbot auto-reply matching."""

import re
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.chatbot_rule import (
    ANY_UNMATCHED,
    BUTTON_PAYLOAD,
    FIRST_INBOUND_WELCOME,
    INTERACTIVE_MENU,
    KEYWORD_MATCH,
    TEMPLATE as TEMPLATE_RESPONSE,
    ChatbotFlow,
)
from app.models.contact import SECTORS, HniContact
from app.models.system_setting import LIVE, get_whatsapp_mode
from app.models.template_campaign import (
    CAMPAIGN_COMPLETED,
    CAMPAIGN_RUNNING,
    DELIVERED_STATES,
    READ_STATES,
    SENT_STATES,
    BulkCampaign,
    WhatsAppTemplate,
)
from app.models.whatsapp_message import (
    DELIVERED,
    FAILED,
    INBOUND,
    INTERACTIVE,
    OUTBOUND,
    READ,
    RECEIVED,
    REPLIED,
    SENT,
    TEMPLATE,
    TEXT,
    WhatsAppMessage,
)

VARIABLE_PATTERN = re.compile(r"\{\{\s*([a-zA-Z_]+)\s*\}\}")

SAMPLE_CONTEXT = {
    "client_name": "Amit Shah",
    "company_name": "ABC Pvt Ltd",
    "sector": "Textile Industry",
    "subsidy_amount": "₹185.5 Lakhs",
    "inquiry_id": "#123",
    "district": "Surat",
    "taluka": "Olpad",
    "project_type": "Expansion",
    "assigned_ca": "CA Abhishek Jain",
}

SECTOR_SIGNALS = {
    "Textile Industry": ("textile", "textiles", "weaving", "spinning", "fabric", "garment"),
    "Information Technology": ("software", "saas", "information technology", "tech", "digital", "app"),
    "Pharmaceuticals": ("pharma", "pharmaceutical", "formulation", "api", "chemical"),
    "Green Energy": ("green energy", "solar", "renewable", "wind", "biomass", "bio", "energy"),
}


def mock_active(db: Session) -> bool:
    return get_whatsapp_mode(db) != LIVE


def format_lakhs(value: float) -> str:
    text = f"{value:,.2f}".rstrip("0").rstrip(".")
    return f"₹{text or '0'} Lakhs"


def contact_context(contact: HniContact | None) -> dict:
    if contact is None:
        return dict(SAMPLE_CONTEXT)
    return {
        "client_name": contact.client_name,
        "company_name": contact.company_name or contact.client_name,
        "sector": contact.sector or "industrial",
        "subsidy_amount": format_lakhs(contact.estimated_subsidy_lakhs),
        "inquiry_id": contact.inquiry_id,
        "district": contact.district or "Gujarat",
        "taluka": contact.taluka or contact.district or "Gujarat",
        "project_type": contact.project_type or "New",
        "assigned_ca": contact.assigned_ca or "our CA desk",
    }


def render(text: str, contact: HniContact | None) -> str:
    context = contact_context(contact)
    return VARIABLE_PATTERN.sub(lambda match: str(context.get(match.group(1), match.group(0))), text or "")


def infer_sector(text: str) -> str:
    haystack = (text or "").lower()
    for sector, signals in SECTOR_SIGNALS.items():
        if any(re.search(rf"\b{re.escape(signal)}\b", haystack) for signal in signals):
            return sector
    return ""


def _message(
    contact: HniContact,
    body: str,
    *,
    direction: str,
    status: str,
    message_type: str = TEXT,
    is_mock: bool,
    campaign_id: int | None = None,
    template_id: int | None = None,
    chatbot_flow_id: int | None = None,
) -> WhatsAppMessage:
    return WhatsAppMessage(
        contact_id=contact.id,
        campaign_id=campaign_id,
        template_id=template_id,
        chatbot_flow_id=chatbot_flow_id,
        direction=direction,
        message_type=message_type,
        body=body,
        status=status,
        wa_message_id=f"mock-{direction.lower()}-{datetime.now():%Y%m%d%H%M%S%f}" if is_mock else "",
        is_mock=is_mock,
    )


# --------------------------------------------------------------------------- templates


def welcome_template(db: Session) -> WhatsAppTemplate | None:
    template = db.scalar(
        select(WhatsAppTemplate)
        .where(WhatsAppTemplate.is_welcome_default.is_(True))
        .order_by(WhatsAppTemplate.id.desc())
    )
    if template is not None:
        return template
    return db.scalar(select(WhatsAppTemplate).where(WhatsAppTemplate.category == "WELCOME").order_by(WhatsAppTemplate.id))


def send_template(
    db: Session,
    contact: HniContact,
    template: WhatsAppTemplate,
    *,
    campaign_id: int | None = None,
    status: str = SENT,
) -> WhatsAppMessage:
    message = _message(
        contact,
        render(template.body_text, contact),
        direction=OUTBOUND,
        status=status,
        message_type=TEMPLATE,
        is_mock=mock_active(db),
        campaign_id=campaign_id,
        template_id=template.id,
    )
    db.add(message)
    return message


def send_welcome(db: Session, contacts: list[HniContact]) -> int:
    """Dispatch the active WELCOME template to freshly added/imported opted-in HNI clients."""
    template = welcome_template(db)
    if template is None:
        return 0
    sent = 0
    for contact in contacts:
        if not contact.opt_in_status:
            continue
        send_template(db, contact, template, status=DELIVERED if mock_active(db) else SENT)
        contact.add_tags("Welcome Sent")
        sent += 1
    db.commit()
    return sent


# --------------------------------------------------------------------------- campaigns


def contacts_for_segment(db: Session, segment: str) -> list[HniContact]:
    """Segment = ALL, a sector, an enterprise class, or TAG:<tag>."""
    segment = (segment or "ALL").strip()
    query = select(HniContact).where(HniContact.opt_in_status.is_(True))
    upper = segment.upper()
    if upper and upper not in ("ALL", "ALL OPTED-IN", "ALL OPTED-IN HNI CLIENTS"):
        if upper == "MSME":
            query = query.where(HniContact.enterprise_classification.ilike("MSME%"))
        elif upper.startswith("TAG:"):
            tag = segment[4:].strip()
            query = query.where(HniContact.tags.ilike(f"%{tag}%"))
        else:
            query = query.where(
                or_(HniContact.sector == segment, HniContact.enterprise_classification == segment)
            )
    return list(db.scalars(query.order_by(HniContact.id)).all())


def segment_options(db: Session) -> list[dict]:
    contacts = db.scalars(select(HniContact)).all()
    opted_in = [contact for contact in contacts if contact.opt_in_status]
    options = [{"segment": "ALL", "label": "All opted-in HNI clients", "count": len(opted_in)}]

    for sector in SECTORS:
        count = sum(1 for contact in opted_in if contact.sector == sector)
        options.append({"segment": sector, "label": sector, "count": count})
    options.append(
        {
            "segment": "MSME",
            "label": "MSME (Small + Medium)",
            "count": sum(1 for contact in opted_in if contact.enterprise_classification.startswith("MSME")),
        }
    )
    for classification in ("Large Enterprise", "Startup"):
        options.append(
            {
                "segment": classification,
                "label": classification,
                "count": sum(1 for contact in opted_in if contact.enterprise_classification == classification),
            }
        )
    tags = sorted({tag for contact in opted_in for tag in contact.tag_list})
    for tag in tags:
        options.append(
            {
                "segment": f"TAG:{tag}",
                "label": f"Tag · {tag}",
                "count": sum(1 for contact in opted_in if tag.lower() in contact.tags.lower()),
            }
        )
    return options


def refresh_campaign_counters(db: Session, campaign: BulkCampaign) -> BulkCampaign:
    statuses = list(
        db.scalars(select(WhatsAppMessage.status).where(WhatsAppMessage.campaign_id == campaign.id)).all()
    )
    total = len(statuses)
    campaign.total_targeted = total
    campaign.sent_count = sum(1 for status in statuses if status in SENT_STATES)
    campaign.delivered_count = sum(1 for status in statuses if status in DELIVERED_STATES)
    campaign.read_count = sum(1 for status in statuses if status in READ_STATES)
    campaign.replied_count = sum(1 for status in statuses if status == REPLIED)
    finished = total == 0 or all(status in READ_STATES or status == FAILED for status in statuses)
    campaign.status = CAMPAIGN_COMPLETED if finished else CAMPAIGN_RUNNING
    db.commit()
    db.refresh(campaign)
    return campaign


def advance_campaign_delivery(db: Session, campaign: BulkCampaign) -> BulkCampaign:
    """Simulate Meta delivery webhooks: SENT -> DELIVERED -> READ, with occasional client replies."""
    messages = list(
        db.scalars(
            select(WhatsAppMessage)
            .where(WhatsAppMessage.campaign_id == campaign.id)
            .order_by(WhatsAppMessage.id)
        ).all()
    )
    for index, message in enumerate(messages):
        if message.status == SENT:
            message.status = DELIVERED
        elif message.status == DELIVERED:
            message.status = READ
        if message.status == READ and index % 4 == 0:
            message.status = REPLIED
    db.commit()
    return refresh_campaign_counters(db, campaign)


def mark_campaign_reply(db: Session, contact: HniContact) -> None:
    """An inbound client reply bumps the corresponding outbound campaign bubble to REPLIED."""
    campaign_ids = {
        campaign_id
        for campaign_id in db.scalars(
            select(WhatsAppMessage.campaign_id).where(
                WhatsAppMessage.contact_id == contact.id, WhatsAppMessage.campaign_id.is_not(None)
            )
        ).all()
        if campaign_id
    }
    for campaign_id in campaign_ids:
        latest = db.scalar(
            select(WhatsAppMessage)
            .where(
                WhatsAppMessage.campaign_id == campaign_id,
                WhatsAppMessage.contact_id == contact.id,
                WhatsAppMessage.direction == OUTBOUND,
            )
            .order_by(WhatsAppMessage.id.desc())
        )
        if latest is not None:
            latest.status = REPLIED
        campaign = db.get(BulkCampaign, campaign_id)
        if campaign is not None:
            db.commit()
            refresh_campaign_counters(db, campaign)
    db.commit()


# --------------------------------------------------------------------------- chatbot


def _pick_flow(db: Session, text: str, first_inbound: bool) -> ChatbotFlow | None:
    flows = list(
        db.scalars(
            select(ChatbotFlow).where(ChatbotFlow.is_active.is_(True)).order_by(ChatbotFlow.id)
        ).all()
    )

    best: ChatbotFlow | None = None
    best_score = 0
    for flow in flows:
        if flow.trigger_type not in (KEYWORD_MATCH, BUTTON_PAYLOAD):
            continue
        score = flow.match_score(text)
        if score > best_score:
            best, best_score = flow, score

    # A real intent keyword (>= 4 chars) beats the generic first-touch greeting.
    if best is not None and best_score >= 4:
        return best
    if first_inbound:
        for flow in flows:
            if flow.trigger_type == FIRST_INBOUND_WELCOME:
                return flow
    if best is not None:
        return best

    for flow in flows:
        if flow.trigger_type == ANY_UNMATCHED:
            return flow
    return None


def _flow_reply(db: Session, flow: ChatbotFlow, contact: HniContact) -> tuple[str, str, int | None]:
    if flow.response_type == TEMPLATE_RESPONSE:
        template = db.get(WhatsAppTemplate, flow.template_id) if flow.template_id else None
        if template is None and flow.response_content:
            template = db.scalar(
                select(WhatsAppTemplate).where(WhatsAppTemplate.template_name == flow.response_content.strip())
            )
        if template is not None:
            return render(template.body_text, contact), TEMPLATE, template.id
        return render(flow.response_content, contact), TEXT, None
    if flow.response_type == INTERACTIVE_MENU:
        return render(flow.response_content, contact), INTERACTIVE, None
    return render(flow.response_content, contact), TEXT, None


def handle_inbound(db: Session, contact: HniContact, text: str) -> dict:
    """Store the client message, match a chatbot flow, auto-tag the lead and store the reply."""
    body = (text or "").strip()
    is_mock = mock_active(db)
    prior_inbound = db.scalar(
        select(func.count())
        .select_from(WhatsAppMessage)
        .where(WhatsAppMessage.contact_id == contact.id, WhatsAppMessage.direction == INBOUND)
    ) or 0
    first_inbound = prior_inbound == 0

    inbound = _message(contact, body, direction=INBOUND, status=RECEIVED, is_mock=is_mock)
    db.add(inbound)
    db.flush()

    flow = _pick_flow(db, body, first_inbound)
    inferred_sector = infer_sector(body)
    if inferred_sector and not contact.sector:
        contact.sector = inferred_sector
    if contact.sector:
        contact.add_tags(f"{contact.sector} Lead")

    reply: WhatsAppMessage | None = None
    if flow is not None:
        if flow.auto_assign_sector and not contact.sector:
            from app.services.contact_io import canonical_sector

            contact.sector = canonical_sector(flow.auto_assign_sector)
        if flow.auto_assign_ca and not contact.assigned_ca:
            contact.assigned_ca = flow.auto_assign_ca
        reply_body, reply_type, template_id = _flow_reply(db, flow, contact)
        reply = _message(
            contact,
            reply_body,
            direction=OUTBOUND,
            status=DELIVERED if is_mock else SENT,
            message_type=reply_type,
            is_mock=is_mock,
            template_id=template_id,
            chatbot_flow_id=flow.id,
        )
        db.add(reply)
        flow.hit_count += 1
        contact.add_tags("Chatbot Auto-Replied")

    db.commit()
    mark_campaign_reply(db, contact)
    db.refresh(inbound)
    if reply is not None:
        db.refresh(reply)
        db.refresh(flow)
    db.refresh(contact)

    return {
        "inbound": inbound.public(),
        "reply": reply.public() if reply is not None else None,
        "matched_flow": flow.public() if flow is not None else None,
        "first_inbound": first_inbound,
        "auto_tags": contact.tag_list,
        "contact": contact.public(),
    }


def manual_reply(
    db: Session,
    contact: HniContact,
    body: str,
    *,
    template: WhatsAppTemplate | None = None,
) -> WhatsAppMessage:
    is_mock = mock_active(db)
    message = _message(
        contact,
        render(template.body_text, contact) if template is not None else body,
        direction=OUTBOUND,
        status=DELIVERED if is_mock else SENT,
        message_type=TEMPLATE if template is not None else TEXT,
        is_mock=is_mock,
        template_id=template.id if template is not None else None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def mock_counts(db: Session) -> dict:
    def _count(model) -> int:
        return db.scalar(select(func.count()).select_from(model).where(model.is_mock.is_(True))) or 0

    return {
        "contacts": _count(HniContact),
        "templates": _count(WhatsAppTemplate),
        "campaigns": _count(BulkCampaign),
        "chatbot_flows": _count(ChatbotFlow),
        "messages": _count(WhatsAppMessage),
    }
