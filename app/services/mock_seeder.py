"""Realistic Gujarat HNI presentation data and the one-click mock purge.

Everything seeded here carries `is_mock = True`, so the Meta API cutover can wipe the
entire showcase in a single statement and leave only genuine production records.
"""

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.chatbot_rule import (
    ANY_UNMATCHED,
    FIRST_INBOUND_WELCOME,
    INTERACTIVE_MENU,
    KEYWORD_MATCH,
    TEMPLATE as TEMPLATE_RESPONSE,
    TEXT,
    ChatbotFlow,
)
from app.models.contact import HniContact
from app.models.template_campaign import BulkCampaign, WhatsAppTemplate
from app.models.whatsapp_message import DELIVERED, READ, REPLIED, SENT, WhatsAppMessage
from app.services import whatsapp_engine
from app.services.contact_io import build_contact

SEED_CONTACTS = (
    {
        "inquiry_id": "#123",
        "client_name": "Amit Shah",
        "company_name": "ABC Pvt Ltd",
        "whatsapp_number": "+91 98250 11223",
        "email": "amit.shah@abcgroup.in",
        "district": "Surat",
        "taluka": "Olpad",
        "sector": "Textile Industry",
        "category": "Manufacturing",
        "enterprise_classification": "MSME - Medium",
        "term_loan_planned": "Yes",
        "project_type": "Expansion",
        "estimated_subsidy_lakhs": 185.5,
        "tags": "VIP HNI, Welcome Sent, Term Loan",
        "assigned_ca": "CA Abhishek Jain",
    },
    {
        "inquiry_id": "#938",
        "client_name": "Rohan Patel",
        "company_name": "Newgen InfoTech",
        "whatsapp_number": "+919876543210",
        "email": "rohan@newgeninfotech.com",
        "district": "Ahmedabad",
        "taluka": "Sanand",
        "sector": "Information Technology",
        "category": "Services",
        "enterprise_classification": "Large Enterprise",
        "term_loan_planned": "No",
        "project_type": "New",
        "estimated_subsidy_lakhs": 92.0,
        "tags": "VIP HNI, CA Assigned, High Value",
        "assigned_ca": "CA Abhishek Jain",
    },
    {
        "inquiry_id": "#412",
        "client_name": "Hetal Mehta",
        "company_name": "Shreeji Pharma Labs",
        "whatsapp_number": "+919898012345",
        "email": "hetal@shreejipharma.in",
        "district": "Vadodara",
        "taluka": "Padra",
        "sector": "Pharmaceuticals",
        "category": "Manufacturing",
        "enterprise_classification": "MSME - Small",
        "term_loan_planned": "Yes",
        "project_type": "Expansion",
        "estimated_subsidy_lakhs": 74.25,
        "tags": "Document Pending, Term Loan",
        "assigned_ca": "Rahul Desai",
    },
    {
        "inquiry_id": "#587",
        "client_name": "Jayesh Desai",
        "company_name": "Sunrise Solar Energy",
        "whatsapp_number": "+919724533110",
        "email": "jayesh@sunrisesolar.co.in",
        "district": "Rajkot",
        "taluka": "Kotda Sangani",
        "sector": "Green Energy",
        "category": "Manufacturing",
        "enterprise_classification": "Startup",
        "term_loan_planned": "Yes",
        "project_type": "New",
        "estimated_subsidy_lakhs": 48.0,
        "tags": "Welcome Sent, Startup",
        "assigned_ca": "Rahul Desai",
    },
    {
        "inquiry_id": "#631",
        "client_name": "Nirav Trivedi",
        "company_name": "Trivedi Textiles LLP",
        "whatsapp_number": "+919327677889",
        "email": "nirav@triveditextiles.com",
        "district": "Surat",
        "taluka": "Tarapur",
        "sector": "Textile Industry",
        "category": "Manufacturing",
        "enterprise_classification": "MSME - Medium",
        "term_loan_planned": "Yes",
        "project_type": "Expansion",
        "estimated_subsidy_lakhs": 152.0,
        "tags": "VIP HNI, Term Loan",
        "assigned_ca": "CA Abhishek Jain",
    },
    {
        "inquiry_id": "#704",
        "client_name": "Kruti Shah",
        "company_name": "Anant Bio Fuels",
        "whatsapp_number": "+919409112233",
        "email": "kruti@anantbiofuels.in",
        "district": "Anand",
        "taluka": "Khambhat",
        "sector": "Green Energy",
        "category": "Agro Processing",
        "enterprise_classification": "MSME - Small",
        "term_loan_planned": "No",
        "project_type": "New",
        "estimated_subsidy_lakhs": 36.5,
        "tags": "Welcome Sent",
        "assigned_ca": "Rahul Desai",
    },
    {
        "inquiry_id": "#812",
        "client_name": "Manish Joshi",
        "company_name": "Cygnet Softtech",
        "whatsapp_number": "+919033344556",
        "email": "manish@cygnetsofttech.com",
        "district": "Ahmedabad",
        "taluka": "Dholka",
        "sector": "Information Technology",
        "category": "Services",
        "enterprise_classification": "MSME - Medium",
        "term_loan_planned": "Yes",
        "project_type": "Expansion",
        "estimated_subsidy_lakhs": 66.75,
        "tags": "CA Assigned, Term Loan",
        "assigned_ca": "CA Abhishek Jain",
    },
    {
        "inquiry_id": "#867",
        "client_name": "Bhavna Shah",
        "company_name": "Vraj Chemicals",
        "whatsapp_number": "+919825577664",
        "email": "bhavna@vrajchem.in",
        "district": "Bharuch",
        "taluka": "Ankleshwar",
        "sector": "Pharmaceuticals",
        "category": "Manufacturing",
        "enterprise_classification": "Large Enterprise",
        "term_loan_planned": "Yes",
        "project_type": "New",
        "estimated_subsidy_lakhs": 240.0,
        "tags": "VIP HNI, High Value, Term Loan",
        "assigned_ca": "CA Abhishek Jain",
    },
    {
        "inquiry_id": "#903",
        "client_name": "Parth Bhatt",
        "company_name": "Surat Weave Exports",
        "whatsapp_number": "+919762233445",
        "email": "parth@suratweave.com",
        "district": "Surat",
        "taluka": "Olpad",
        "sector": "Textile Industry",
        "category": "Trading",
        "enterprise_classification": "MSME - Small",
        "term_loan_planned": "No",
        "project_type": "New",
        "estimated_subsidy_lakhs": 29.5,
        "tags": "Welcome Sent",
        "assigned_ca": "Rahul Desai",
    },
    {
        "inquiry_id": "#977",
        "client_name": "Sneha Kothari",
        "company_name": "Kothari Green Fuels",
        "whatsapp_number": "+919909988776",
        "email": "sneha@kotharigreen.in",
        "district": "Vadodara",
        "taluka": "Savli",
        "sector": "Green Energy",
        "category": "Manufacturing",
        "enterprise_classification": "Startup",
        "term_loan_planned": "Yes",
        "project_type": "Expansion",
        "estimated_subsidy_lakhs": 58.4,
        "tags": "New Lead",
        "assigned_ca": "Rahul Desai",
    },
)

SEED_TEMPLATES = (
    {
        "template_name": "Welcome Onboarding Message",
        "category": "WELCOME",
        "language": "en_IN",
        "header_text": "Welcome to SubsidyX",
        "body_text": (
            "Hello {{client_name}},\n\n"
            "Thank you for connecting with SubsidyX. Your inquiry {{inquiry_id}} for {{company_name}} "
            "has been registered under the {{sector}} sector.\n\n"
            "Our CA desk is reviewing an indicative subsidy benefit of {{subsidy_amount}} for your "
            "{{project_type}} project in {{district}}. A dedicated Chartered Accountant will "
            "reach out within 24 working hours.\n\n"
            "Reply MENU anytime to explore Gujarat industrial subsidy schemes."
        ),
        "footer_text": "SubsidyX · Gujarat Industrial Subsidy Advisory",
        "buttons_json": '[{"type": "QUICK_REPLY", "text": "Check Eligibility"}, {"type": "QUICK_REPLY", "text": "Talk to CA"}]',
        "is_welcome_default": True,
    },
    {
        "template_name": "Gujarat Industrial Policy Subsidy Alert",
        "category": "SUBSIDY_ALERT",
        "language": "en_IN",
        "header_text": "Gujarat Industrial Policy 2026 — Subsidy Window Open",
        "body_text": (
            "Dear {{client_name}},\n\n"
            "Under the latest Gujarat Industrial Policy, {{company_name}} is eligible for an estimated "
            "capital subsidy of {{subsidy_amount}} on your {{sector}} expansion.\n\n"
            "Inquiry reference: {{inquiry_id}}\n"
            "District: {{district}} · Taluka: {{taluka}}\n\n"
            "The application window closes in 45 days. Share your term loan sanction letter to lock the "
            "benefit with our CA team."
        ),
        "footer_text": "Terms as per Gujarat Industrial Policy 2026",
        "buttons_json": '[{"type": "QUICK_REPLY", "text": "Start Application"}, {"type": "QUICK_REPLY", "text": "Send Checklist"}]',
        "is_welcome_default": False,
    },
    {
        "template_name": "CA Term Loan Document Checklist",
        "category": "CA_DOCUMENT_REQUEST",
        "language": "en_IN",
        "header_text": "Term Loan Documentation Checklist",
        "body_text": (
            "Hello {{client_name}},\n\n"
            "To process the subsidy claim for {{company_name}} ({{inquiry_id}}), our CA {{assigned_ca}} "
            "needs these documents:\n\n"
            "1. Term loan sanction letter\n"
            "2. Udyam / MSME registration\n"
            "3. GST returns — last 2 years\n"
            "4. Project cost statement & machinery quotations\n"
            "5. Board resolution for {{sector}} expansion\n\n"
            "Upload them here on WhatsApp and we will begin the appraisal immediately."
        ),
        "footer_text": "SubsidyX CA Desk · {{assigned_ca}}",
        "buttons_json": '[{"type": "QUICK_REPLY", "text": "Upload Documents"}]',
        "is_welcome_default": False,
    },
    {
        "template_name": "Festival & Policy Update Broadcast",
        "category": "MARKETING",
        "language": "en_IN",
        "header_text": "SubsidyX Festive Greetings",
        "body_text": (
            "Dear {{client_name}},\n\n"
            "Warm festive greetings from the entire SubsidyX family.\n\n"
            "As {{company_name}} plans its next {{sector}} milestone, remember that government subsidy "
            "files submitted this quarter are processed 2x faster. Your indicative benefit stands at "
            "{{subsidy_amount}}.\n\n"
            "Reply HELLO and our team will re-validate your eligibility free of cost."
        ),
        "footer_text": "Reply STOP to opt out of updates",
        "buttons_json": "",
        "is_welcome_default": False,
    },
    {
        "template_name": "સ્વાગત સંદેશ (Gujarati Welcome)",
        "category": "WELCOME",
        "language": "gu_IN",
        "header_text": "સબસિડીX માં આપનું સ્વાગત છે",
        "body_text": (
            "નમસ્તે {{client_name}},\n\n"
            "{{company_name}} ની {{sector}} પ્રોજેક્ટ માટે અમે તમારી ચકાસણી શરૂ કરી છે. અંદાજિત સબસિડી "
            "{{subsidy_amount}} છે.\n\n"
            "તમારો ઈન્ક્વાયરી નંબર {{inquiry_id}} છે. અમારા CA ટીમ 24 કલાકમાં સંપર્ક કરશે."
        ),
        "footer_text": "SubsidyX · ગુજરાત ઔદ્યોગિક સબસિડી",
        "buttons_json": "",
        "is_welcome_default": False,
    },
)

SEED_FLOWS = (
    {
        "bot_name": "First Touch Welcome",
        "trigger_type": FIRST_INBOUND_WELCOME,
        "trigger_keywords": "",
        "response_type": TEXT,
        "response_content": (
            "Namaste {{client_name}}.\n\n"
            "Welcome to SubsidyX. I am the SubsidyX Assistant and I can help with Gujarat industrial "
            "subsidy eligibility, term loan documentation and application status for {{company_name}}.\n\n"
            "Reply with your sector — Textile, IT, Pharma, Green Energy — or type SUBSIDY to "
            "check your eligibility."
        ),
        "auto_assign_sector": "",
        "auto_assign_ca": "",
    },
    {
        "bot_name": "Main Menu",
        "trigger_type": KEYWORD_MATCH,
        "trigger_keywords": "hi, hello, namaste, hey, menu, start",
        "response_type": INTERACTIVE_MENU,
        "response_content": (
            "Welcome back {{client_name}}.\n\n"
            "Please choose an option:\n"
            "1. Check subsidy eligibility\n"
            "2. Term loan documentation\n"
            "3. Application status ({{inquiry_id}})\n"
            "4. Talk to a CA"
        ),
        "auto_assign_sector": "",
        "auto_assign_ca": "",
    },
    {
        "bot_name": "Subsidy Eligibility Advisor",
        "trigger_type": KEYWORD_MATCH,
        "trigger_keywords": "subsidy, eligibility, scheme, loan, textile, pharma, green energy, software, expansion",
        "response_type": TEXT,
        "response_content": (
            "Great news {{client_name}} — for your {{sector}} project at {{company_name}} our CA desk has "
            "shortlisted 3 Gujarat industrial schemes with an indicative benefit of {{subsidy_amount}}.\n\n"
            "Inquiry {{inquiry_id}} · District {{district}}\n\n"
            "To begin the formal appraisal, reply *DOCUMENTS* and I will send the term loan checklist."
        ),
        "auto_assign_sector": "",
        "auto_assign_ca": "CA Abhishek Jain",
    },
    {
        "bot_name": "Application Status Tracker",
        "trigger_type": KEYWORD_MATCH,
        "trigger_keywords": "status, track, inquiry, application, update, progress",
        "response_type": TEXT,
        "response_content": (
            "Your inquiry {{inquiry_id}} for {{company_name}} is currently in *Document Verification*.\n\n"
            "Estimated subsidy: {{subsidy_amount}}\n"
            "Assigned CA: {{assigned_ca}}\n\n"
            "Our CA will share the next checklist with you today. Anything else I can check for you?"
        ),
        "auto_assign_sector": "",
        "auto_assign_ca": "",
    },
    {
        "bot_name": "Document Checklist Sender",
        "trigger_type": KEYWORD_MATCH,
        "trigger_keywords": "document, documents, checklist, sanction, gst, pan, udyam",
        "response_type": TEMPLATE_RESPONSE,
        "response_content": "CA Term Loan Document Checklist",
        "auto_assign_sector": "",
        "auto_assign_ca": "CA Abhishek Jain",
    },
    {
        "bot_name": "Fallback — Human Handover",
        "trigger_type": ANY_UNMATCHED,
        "trigger_keywords": "",
        "response_type": TEXT,
        "response_content": (
            "Thank you for your message, {{client_name}}. Our relationship manager has been notified and "
            "will respond shortly.\n\nFor faster help, type *MENU* to see the available options."
        ),
        "auto_assign_sector": "",
        "auto_assign_ca": "Rahul Desai",
    },
)

SEED_CHAT_THREADS = (
    ("+919825011223", "Hi, I need Gujarat Textile Subsidy details for our ₹15Cr expansion"),
    ("+919724533110", "Hello, what documents are needed for the term loan sanction?"),
    ("+919033344556", "Hi team, any update on our application status?"),
    ("+919898012345", "Namaste, please share the subsidy eligibility for our pharma unit"),
)

SEED_CAMPAIGNS = (
    {
        "campaign_name": "Gujarat Textile Policy 2026 — Subsidy Alert",
        "segment": "Textile Industry",
        "template_name": "Gujarat Industrial Policy Subsidy Alert",
        "statuses": (READ, REPLIED, READ),
        "launched_by": "nisarg",
    },
    {
        "campaign_name": "MSME Term Loan Document Drive",
        "segment": "MSME",
        "template_name": "CA Term Loan Document Checklist",
        "statuses": (SENT, DELIVERED, READ, DELIVERED, SENT),
        "launched_by": "gajendra",
    },
    {
        "campaign_name": "HNI Welcome Onboarding Wave",
        "segment": "ALL",
        "template_name": "Welcome Onboarding Message",
        "statuses": (READ, REPLIED, READ, READ),
        "launched_by": "abhishek",
    },
)


def purge_mock_data(db: Session) -> dict:
    """DELETE every is_mock row — messages first so no orphaned conversation history remains."""
    purged = {}
    for model in (WhatsAppMessage, BulkCampaign, ChatbotFlow, WhatsAppTemplate, HniContact):
        result = db.execute(delete(model).where(model.is_mock.is_(True)))
        purged[model.__tablename__] = result.rowcount or 0
    db.commit()
    return purged


def _seed_campaign(db: Session, spec: dict, contacts: list[HniContact], template: WhatsAppTemplate) -> None:
    campaign = BulkCampaign(
        campaign_name=spec["campaign_name"],
        segment=spec["segment"],
        template_id=template.id,
        template_name=template.template_name,
        total_targeted=len(contacts),
        launched_by=spec["launched_by"],
        is_mock=True,
    )
    db.add(campaign)
    db.flush()
    statuses = spec["statuses"]
    for index, contact in enumerate(contacts):
        whatsapp_engine.send_template(
            db, contact, template, campaign_id=campaign.id, status=statuses[index % len(statuses)]
        )
    db.commit()
    whatsapp_engine.refresh_campaign_counters(db, campaign)


def seed_presentation_data(db: Session, *, force: bool = False) -> dict:
    """Idempotent: only seeds MOCK mode with an empty contact book."""
    if not whatsapp_engine.mock_active(db):
        return {"seeded": False, "reason": "System is in LIVE mode — presentation data not seeded."}
    existing = db.scalar(select(func.count()).select_from(HniContact)) or 0
    if existing and not force:
        return {"seeded": False, "reason": "Contact book already populated."}

    contacts: list[HniContact] = []
    existing_numbers = set(db.scalars(select(HniContact.whatsapp_number)).all())
    existing_inquiry_ids = set(db.scalars(select(HniContact.inquiry_id)).all())
    for spec in SEED_CONTACTS:
        contact = build_contact(spec, is_mock=True)
        if contact.whatsapp_number in existing_numbers or spec["inquiry_id"] in existing_inquiry_ids:
            continue
        contact.inquiry_id = spec["inquiry_id"]
        db.add(contact)
        contacts.append(contact)
    db.commit()

    templates: dict[str, WhatsAppTemplate] = {}
    for spec in SEED_TEMPLATES:
        template = WhatsAppTemplate(is_mock=True, **spec)
        db.add(template)
        templates[spec["template_name"]] = template
    db.commit()

    for spec in SEED_FLOWS:
        db.add(ChatbotFlow(is_mock=True, **spec))
    db.commit()

    by_number = {
        contact.whatsapp_number: contact
        for contact in db.scalars(
            select(HniContact).where(HniContact.whatsapp_number.in_([phone for phone, _ in SEED_CHAT_THREADS]))
        ).all()
    }
    for spec in SEED_CAMPAIGNS:
        template = templates.get(spec["template_name"])
        if template is None:
            continue
        targeted = whatsapp_engine.contacts_for_segment(db, spec["segment"])
        _seed_campaign(db, spec, targeted, template)

    for phone, text in SEED_CHAT_THREADS:
        contact = by_number.get(phone)
        if contact is not None:
            whatsapp_engine.handle_inbound(db, contact, text)

    return {
        "seeded": True,
        "contacts": len(contacts),
        "templates": len(templates),
        "chatbot_flows": len(SEED_FLOWS),
        "campaigns": len(SEED_CAMPAIGNS),
        "messages": db.scalar(select(func.count()).select_from(WhatsAppMessage)) or 0,
    }
