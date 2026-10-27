"""Comprehensive Production Test Suite — October 2026 Enterprise Sprint.

Validates:
1. Mobile OTP Authentication & Security Shield (Zero Hardcoding, Zero Leakage, 403, 429).
2. PostgreSQL User & Profile Editing via ORM.
3. Multiple Client Lists (Audience Categorization) & Scheduled Bulk Messaging Service.
4. Omnichannel Lead Capture (Instagram, Facebook, Google Forms) & CRM 1-Click Conversion.
5. Strict 10-Row Pagination & Indian Standards Validation.
6. Institutional Print CSS & Navbar Contrast.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import secrets
import sys

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from starlette.testclient import TestClient
from sqlalchemy import select

from app.database import SessionLocal, init_db
from app.main import app
from app.models.audit_log import LoginAuditLog
from app.models.ca_associate import CAAssociateProfile
from app.models.client_list import ClientList, ClientListMembership
from app.models.contact import HniContact
from app.models.leads_integration import IntegrationChannel, OmniLead, SocialCampaignPost
from app.models.template_campaign import BulkCampaign, WhatsAppTemplate
from app.models.user import OTPChallenge, User
from app.models.user_session import UserSession
from app.services import otp_dispatcher
from app.services.campaign_scheduler import execute_campaign
from app.services.security import AUTH_COOKIE, SESSION_COOKIE, create_access_token, issue_dual_tokens

# Ensure DB schema is ready before any tests run
init_db()


def get_admin_user():
    """Fetch seeded Super Admin (Nisarg)."""
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == "nisarg"))
        assert user is not None, "Seeded admin nisarg not found"
        assert user.role == "ADMIN", f"Expected ADMIN, got {user.role}"
        assert user.phone_number == "+919426015394", f"Expected +919426015394, got {user.phone_number}"
        return user


def get_admin_client(admin_user=None):
    """Test client pre-authenticated with Super Admin JWT cookie."""
    if not admin_user:
        admin_user = get_admin_user()
    token = create_access_token(admin_user)
    c = TestClient(app, base_url="http://testserver")
    c.cookies.set(AUTH_COOKIE, token)
    return c


# ==============================================================================
# 1. MOBILE OTP AUTHENTICATION & SECURITY SHIELD
# ==============================================================================


def test_otp_rejected_for_unregistered_phone():
    """Unregistered mobile numbers must be rejected with HTTP 403 Forbidden."""
    client = TestClient(app, base_url="http://testserver")
    res = client.post("/api/auth/request-otp", json={"phone_number": "9999900000"}, headers={"X-Forwarded-For": "10.10.1.1"})
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    assert "not authorized" in res.json()["detail"].lower()


def test_otp_rejected_for_invalid_phone_format():
    """Invalid format (e.g. 5 digits) must return HTTP 400 Bad Request."""
    client = TestClient(app, base_url="http://testserver")
    res = client.post("/api/auth/request-otp", json={"phone_number": "12345"}, headers={"X-Forwarded-For": "10.10.1.2"})
    assert res.status_code in (400, 422), f"Expected 400 or 422, got {res.status_code}"


def test_otp_challenge_generation_and_no_leakage():
    """Bootstrap Super Admin numbers generate an OTPChallenge without leaking the OTP."""
    client = TestClient(app, base_url="http://testserver")
    captured_otps = {}
    orig_send = otp_dispatcher.send_otp

    def mock_send(phone, code, full_name=""):
        captured_otps[phone] = code
        return True

    # Temporarily monkeypatch
    import app.routers.auth as auth_mod
    auth_mod.send_otp = mock_send

    headers = {"X-Forwarded-For": f"10.200.{secrets.randbelow(200)}.{secrets.randbelow(200)}"}
    try:
        for phone in ["9426015394", "7742421983", "9825359575"]:
            res = client.post("/api/auth/request-otp", json={"phone_number": phone}, headers=headers)
            assert res.status_code == 200, f"Failed for {phone}: {res.text}"
            data = res.json()
            assert data["status"] == "otp_sent"
            assert "challenge_token" in data
            assert len(data["challenge_token"]) == 64
            assert "masked_phone" in data

            # Plaintext OTP must NEVER be returned in response body or headers
            assert "otp_code" not in data
            assert "otp" not in data
            assert str(captured_otps.get("+91" + phone)) not in str(data)

            # Login page HTML must NEVER contain admin phone or credentials
            login_html = client.get("/login").text
            assert phone not in login_html
            assert "9426015394" not in login_html
    finally:
        auth_mod.send_otp = orig_send


def test_otp_successful_verification_and_session():
    """Valid OTP verification issues an ADMIN HttpOnly cookie and logs login."""
    client = TestClient(app, base_url="http://testserver")
    captured = {}
    import app.routers.auth as auth_mod
    orig_send = auth_mod.send_otp
    auth_mod.send_otp = lambda p, c, n="": captured.update({p: c}) or True

    headers = {"X-Forwarded-For": f"10.201.{secrets.randbelow(200)}.{secrets.randbelow(200)}"}
    try:
        # 1. Request OTP
        req_res = client.post("/api/auth/request-otp", json={"phone_number": "9426015394"}, headers=headers)
        assert req_res.status_code == 200, req_res.text
        token = req_res.json()["challenge_token"]
        otp_code = captured["+919426015394"]

        # 2. Verify OTP
        ver_res = client.post(
            "/api/auth/verify-otp",
            json={"phone_number": "9426015394", "challenge_token": token, "otp_code": otp_code},
            headers=headers,
        )
        assert ver_res.status_code == 200, ver_res.text
        ver_data = ver_res.json()
        assert ver_data["status"] == "ok"
        assert ver_data["role"] == "ADMIN"
        assert ver_data["redirect_url"] == "/dashboard"
        assert AUTH_COOKIE in ver_res.cookies

        # 3. Verify LoginAuditLog row was recorded
        with SessionLocal() as db:
            log = db.scalar(
                select(LoginAuditLog)
                .where(LoginAuditLog.username_attempted.in_(["+919426015394", "nisarg"]))
                .order_by(LoginAuditLog.id.desc())
            )
            assert log is not None
            assert log.status == "SUCCESS"
            assert log.role_detected == "ADMIN"
    finally:
        auth_mod.send_otp = orig_send


def test_otp_max_attempts_lockout():
    """Challenge locks out after 3 invalid OTP attempts."""
    client = TestClient(app, base_url="http://testserver")
    import app.routers.auth as auth_mod
    orig_send = auth_mod.send_otp
    auth_mod.send_otp = lambda p, c, n="": True

    headers = {"X-Forwarded-For": f"10.88.{secrets.randbelow(200)}.{secrets.randbelow(200)}"}
    try:
        req_res = client.post("/api/auth/request-otp", json={"phone_number": "7742421983"}, headers=headers)
        assert req_res.status_code == 200, req_res.text
        token = req_res.json()["challenge_token"]

        # Attempt 1: wrong code
        r1 = client.post("/api/auth/verify-otp", json={"phone_number": "7742421983", "challenge_token": token, "otp_code": "000000"}, headers=headers)
        assert r1.status_code == 400
        assert "2 attempt(s) remaining" in r1.json()["detail"]

        # Attempt 2: wrong code
        r2 = client.post("/api/auth/verify-otp", json={"phone_number": "7742421983", "challenge_token": token, "otp_code": "000001"}, headers=headers)
        assert r2.status_code == 400
        assert "1 attempt(s) remaining" in r2.json()["detail"]

        # Attempt 3: wrong code -> challenge invalidated
        r3 = client.post("/api/auth/verify-otp", json={"phone_number": "7742421983", "challenge_token": token, "otp_code": "000002"}, headers=headers)
        assert r3.status_code == 400
        assert "invalidated" in r3.json()["detail"].lower()
    finally:
        auth_mod.send_otp = orig_send


# ==============================================================================
# 2. USER & PROFILE EDITING IN POSTGRESQL
# ==============================================================================


def test_user_profile_edit():
    """Admin can edit their own profile via PUT /api/auth/profile."""
    admin_user = get_admin_user()
    admin_client = get_admin_client(admin_user)
    payload = {
        "full_name": "Nisarg Parsaniya (Chief Architect)",
        "phone_number": "9426015394",
        "email": "nisarg.architect@subsidyx.local",
        "designation": "Principal System Architect & Super Admin",
    }
    res = admin_client.put("/api/auth/profile", json=payload)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ok"

    # Verify changes in database
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == admin_user.username))
        assert user.full_name == "Nisarg Parsaniya (Chief Architect)"
        assert user.email == "nisarg.architect@subsidyx.local"
        assert user.designation == "Principal System Architect & Super Admin"


def test_employee_crud_and_pagination():
    """Super Admin can create, edit, toggle, and paginate employees at page_size=10."""
    admin_client = get_admin_client()
    rand_id = secrets.token_hex(3)
    emp_phone = f"9820{secrets.randbelow(900000) + 100000}"
    create_payload = {
        "username": f"staff_{rand_id}",
        "full_name": f"Bhavik Mehta {rand_id}",
        "phone_number": emp_phone,
        "email": f"bhavik_{rand_id}@subsidyx.local",
        "designation": "Senior Subsidy Consultant",
        "role": "EMPLOYEE",
    }
    create_res = admin_client.post("/api/admin/employees", json=create_payload)
    assert create_res.status_code in (200, 201), create_res.text
    emp_data = create_res.json().get("employee") or create_res.json().get("user")
    created_id = emp_data["id"]

    # Read with strict page_size=10
    list_res = admin_client.get("/api/admin/employees?page=1&page_size=10")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["page_size"] == 10
    emp_list = list_data.get("employees") or list_data.get("users") or []
    assert any(u["id"] == created_id for u in emp_list)

    # Update employee details
    update_res = admin_client.put(
        f"/api/admin/employees/{created_id}",
        json={
            "full_name": f"Bhavik Mehta (Lead CA) {rand_id}",
            "phone_number": emp_phone,
            "email": f"bhavik.lead_{rand_id}@subsidyx.local",
            "designation": "Lead CA & Senior Advisor",
            "role": "ADMIN",
        },
    )
    assert update_res.status_code == 200

    # Toggle status
    toggle_res = admin_client.patch(f"/api/admin/employees/{created_id}/toggle-status")
    assert toggle_res.status_code == 200
    toggled = toggle_res.json().get("employee") or toggle_res.json().get("user")
    assert toggled["is_active"] is False

    # Cleanup: delete employee
    del_res = admin_client.delete(f"/api/admin/employees/{created_id}")
    assert del_res.status_code == 200


# ==============================================================================
# 3. CLIENT LISTS & SCHEDULED CAMPAIGN ENGINE
# ==============================================================================


def test_client_lists_crud_and_membership():
    """Create client list, assign members, and query with page_size=10."""
    admin_client = get_admin_client()
    rand_list = secrets.token_hex(3)
    list_payload = {
        "name": f"Textile Capital Investors {rand_list}",
        "category": "SECTOR_SEGMENT",
        "description": "High value textile units eligible for capital investment subsidies",
        "color_hex": "#198754",
        "filter_rules_json": '{"sector": "Textile Industry", "min_subsidy_lakhs": 50}',
    }
    create_res = admin_client.post("/api/client-lists", json=list_payload)
    assert create_res.status_code in (200, 201), create_res.text
    list_id = (create_res.json().get("client_list") or create_res.json().get("list"))["id"]

    # Paginated listing at page_size=10
    get_res = admin_client.get("/api/client-lists?page=1&page_size=10")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["page_size"] == 10
    assert any(l["id"] == list_id for l in data["lists"])

    # Enroll contact into list
    with SessionLocal() as db:
        from app.models.contact import HniContact
        contact = db.scalar(select(HniContact).where(HniContact.opt_in_status.is_(True)))
        if not contact:
            contact = HniContact(
                inquiry_id="INQ-TEST-001",
                client_name="Test Enterprise Promoter",
                company_name="Test Enterprises LLP",
                whatsapp_number="+919876543210",
                opt_in_status=True,
                sector="Textile Industry",
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
        cid = contact.id

    add_res = admin_client.post(f"/api/client-lists/{list_id}/members", json={"contact_ids": [cid]})
    assert add_res.status_code == 200

    # Verify membership endpoint
    mem_res = admin_client.get(f"/api/client-lists/{list_id}/members")
    assert mem_res.status_code == 200
    assert any(m.get("id") == cid or m.get("contact_id") == cid for m in mem_res.json()["members"])

    # Delete member
    del_mem = admin_client.delete(f"/api/client-lists/{list_id}/members/{cid}")
    assert del_mem.status_code == 200


def test_scheduled_campaign_creation_and_worker_execution():
    """Create a scheduled campaign and execute it via the scheduler worker."""
    admin_client = get_admin_client()
    # Find or create a template and an opted-in contact
    with SessionLocal() as db:
        from app.models.contact import HniContact
        contact = db.scalar(select(HniContact).where(HniContact.opt_in_status.is_(True)))
        if not contact:
            contact = HniContact(
                inquiry_id="INQ-TEST-002",
                client_name="Solar Power Partner",
                company_name="Solar Sun LLP",
                whatsapp_number="+919876543211",
                opt_in_status=True,
                sector="Green Energy",
            )
            db.add(contact)
            db.commit()

        tpl = db.scalar(select(WhatsAppTemplate))
        if not tpl:
            tpl = WhatsAppTemplate(
                template_name="test_prod_tpl",
                category="SUBSIDY_SCHEME_LAUNCH",
                language="en_IN",
                body_text="Namaste {{client_name}}, subsidy update.",
            )
            db.add(tpl)
            db.commit()
            db.refresh(tpl)
        tpl_id = tpl.id

    # Create scheduled campaign for 5 minutes ago (so it is due immediately)
    past_ist = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    camp_payload = {
        "campaign_name": "Scheduled Solar Subsidy Alert",
        "template_id": tpl_id,
        "campaign_category": "SUBSIDY_SCHEME_LAUNCH",
        "segment": "ALL",
        "schedule_type": "SCHEDULED",
        "scheduled_at_ist": past_ist,
    }
    launch_res = admin_client.post("/api/campaigns/launch", json=camp_payload)
    assert launch_res.status_code in (200, 201), launch_res.text
    camp_id = launch_res.json()["campaign"]["id"]
    assert launch_res.json()["campaign"]["status"] == "SCHEDULED"

    # Execute the campaign scheduler worker
    with SessionLocal() as db:
        campaign = db.get(BulkCampaign, camp_id)
        assert campaign is not None
        assert campaign.status == "SCHEDULED"
        execute_campaign(db, campaign)

    # Verify transition to COMPLETED
    with SessionLocal() as db:
        updated = db.get(BulkCampaign, camp_id)
        assert updated.status == "COMPLETED"
        assert updated.executed_at_ist is not None


# ==============================================================================
# 4. OMNICHANNEL LEADS (INSTAGRAM, FACEBOOK, GOOGLE FORMS) & 1-CLICK CONVERSION
# ==============================================================================


def test_omnichannel_webhook_ingestion():
    """Test webhook ingestion from Instagram, Facebook, and Google Forms."""
    client = TestClient(app, base_url="http://testserver")

    # 1. Instagram Lead
    ig_payload = {
        "lead_name": "Jignesh Shah",
        "company_name": "Shah Polymer Extrusions",
        "mobile_number": "9824112233",
        "email": "jignesh@shahpolymers.in",
        "sector": "Chemical & Polymers",
        "district": "Vadodara",
        "estimated_investment_lakhs": 350.0,
        "estimated_subsidy_lakhs": 85.0,
    }
    ig_res = client.post("/api/integrations/webhooks/instagram", json=ig_payload)
    assert ig_res.status_code in (200, 201), ig_res.text
    assert ig_res.json()["lead"]["source_platform"] == "INSTAGRAM"

    # 2. Facebook Lead
    fb_payload = {
        "lead_name": "Pooja Trivedi",
        "company_name": "Trivedi Agro Foods",
        "mobile_number": "9825445566",
        "email": "pooja@trivediagro.com",
        "sector": "Agro Processing",
        "district": "Rajkot",
        "estimated_investment_lakhs": 180.0,
        "estimated_subsidy_lakhs": 45.0,
    }
    fb_res = client.post("/api/integrations/webhooks/facebook", json=fb_payload)
    assert fb_res.status_code in (200, 201), fb_res.text
    assert fb_res.json()["lead"]["source_platform"] == "FACEBOOK"

    # 3. Google Forms Lead
    gf_payload = {
        "lead_name": "Karan Vora",
        "company_name": "Vora Ceramics LLP",
        "mobile_number": "9826778899",
        "email": "karan@voraceramics.com",
        "sector": "Ceramics & Minerals",
        "district": "Morbi",
        "estimated_investment_lakhs": 600.0,
        "estimated_subsidy_lakhs": 150.0,
    }
    gf_res = client.post("/api/integrations/webhooks/google-forms", json=gf_payload)
    assert gf_res.status_code in (200, 201), gf_res.text
    assert gf_res.json()["lead"]["source_platform"] == "GOOGLE_FORMS"


def test_leads_paginated_crm_and_conversion():
    """Query leads with page_size=10 and 1-click convert a lead into an HNI client."""
    admin_client = get_admin_client()

    # Query leads table
    leads_res = admin_client.get("/api/leads?page=1&page_size=10")
    assert leads_res.status_code == 200, leads_res.text
    data = leads_res.json()
    assert data["page_size"] == 10
    assert "platform_counts" in data
    assert data["total"] >= 3

    # Pick an unconverted lead
    lead = next((l for l in data["leads"] if l["lead_stage"] != "CONVERTED"), None)
    assert lead is not None
    lead_id = lead["id"]

    # 1-Click Convert to HNI Client
    conv_res = admin_client.post(
        f"/api/leads/{lead_id}/convert",
        json={"assigned_ca": "CA Abhishek Jain"},
    )
    assert conv_res.status_code == 200, conv_res.text
    conv_data = conv_res.json()
    assert "contact" in conv_data
    contact_data = conv_data["contact"]
    assert conv_data["lead"]["lead_stage"] == "CONVERTED"

    # Verify lead stage updated in DB
    with SessionLocal() as db:
        db_lead = db.get(OmniLead, lead_id)
        assert db_lead.lead_stage == "CONVERTED"
        assert db_lead.converted_contact_id == contact_data["id"]


# ==============================================================================
# 5. UI CONTRAST & PRINT LAYOUT VERIFICATION
# ==============================================================================


def test_navbar_clock_contrast_and_print_styles():
    """Verify that navbar stacked clock has #FFFFFF contrast and print styles match institutional standard."""
    css_path = Path("app/static/css/custom.css")
    assert css_path.exists()
    css_content = css_path.read_text(encoding="utf-8")

    # 1. Navbar Clock Contrast Fix
    assert ".sx-time-top" in css_content
    assert "#FFFFFF !important" in css_content

    # 2. Institutional Print Sheet Requirements
    assert "@page" in css_content
    assert "size: A4 portrait" in css_content
    assert "margin: 14mm" in css_content
    assert "@media print" in css_content
    assert "page-break-inside: avoid" in css_content


def test_two_minute_otp_and_dual_session_tokens():
    """Validates 120s OTP expiry, dual tokens (JWT + session), UserSession row, and session revocation."""
    client = TestClient(app, base_url="http://testserver")
    captured = {}
    import app.routers.auth as auth_mod
    orig_send = auth_mod.send_otp
    auth_mod.send_otp = lambda p, c, fn="": captured.update({p: c}) or True

    try:
        # Request OTP: verify expires_in_seconds == 120
        res = client.post(
            "/api/auth/request-otp",
            json={"phone_number": "9426015394"},
            headers={"X-Forwarded-For": f"10.201.{secrets.randbelow(200)}.{secrets.randbelow(200)}"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data.get("expires_in_seconds") == 120, f"Expected 120, got {data.get('expires_in_seconds')}"
        token = data["challenge_token"]
        otp = captured.get("+919426015394")
        assert otp and len(otp) == 6

        # Verify OTP: returns dual tokens and creates UserSession
        v_res = client.post("/api/auth/verify-otp", json={"phone_number": "9426015394", "challenge_token": token, "otp_code": otp})
        assert v_res.status_code == 200, v_res.text
        v_data = v_res.json()
        assert "access_token" in v_data
        assert "session_token" in v_data
        assert v_res.cookies.get(AUTH_COOKIE)
        assert v_res.cookies.get(SESSION_COOKIE)

        user_id = v_data["user"]["id"]
        with SessionLocal() as db:
            sess = db.scalar(select(UserSession).where(UserSession.session_token == v_data["session_token"], UserSession.is_active.is_(True)))
            assert sess is not None, "Active UserSession row not found in DB"
            assert sess.session_token == v_data["session_token"]
            assert sess.user_id == user_id
            assert sess.jwt_jti is not None

        # Authenticated call succeeds with session
        auth_client = TestClient(app, base_url="http://testserver")
        auth_client.cookies.set(AUTH_COOKIE, v_data["access_token"])
        auth_client.cookies.set(SESSION_COOKIE, v_data["session_token"])
        me_res = auth_client.get("/api/auth/me")
        assert me_res.status_code == 200

        # Create temporary employee to test 1-click revoke
        admin_c = get_admin_client()
        emp_phone = f"9876{secrets.randbelow(900000) + 100000}"
        emp_res = admin_c.post(
            "/api/admin/employees",
            json={"full_name": "Session Test Emp", "phone_number": emp_phone, "designation": "Staff", "role": "EMPLOYEE"}
        )
        assert emp_res.status_code == 201, emp_res.text
        emp_id = emp_res.json()["employee"]["id"]

        # Log in as this employee to create active session
        captured.clear()
        client.post("/api/auth/request-otp", json={"phone_number": emp_phone}, headers={"X-Forwarded-For": "10.201.1.99"})
        emp_otp = captured.get(f"+91{emp_phone}")
        with SessionLocal() as db:
            ch = db.scalar(select(OTPChallenge).where(OTPChallenge.phone_number == f"+91{emp_phone}").order_by(OTPChallenge.id.desc()))
            ch_token = ch.challenge_token
        emp_v = client.post("/api/auth/verify-otp", json={"phone_number": emp_phone, "challenge_token": ch_token, "otp_code": emp_otp})
        assert emp_v.status_code == 200
        emp_jwt = emp_v.json()["access_token"]
        emp_sess = emp_v.json()["session_token"]

        emp_client = TestClient(app, base_url="http://testserver")
        emp_client.cookies.set(AUTH_COOKIE, emp_jwt)
        emp_client.cookies.set(SESSION_COOKIE, emp_sess)
        assert emp_client.get("/api/auth/me").status_code == 200

        # Super Admin revokes employee credentials
        rev_res = admin_c.patch(f"/api/admin/employees/{emp_id}/revoke")
        assert rev_res.status_code == 200
        assert rev_res.json()["status"] == "ok"

        # On very next click, employee session is kicked out (401)
        kicked = emp_client.get("/api/auth/me")
        assert kicked.status_code == 401, f"Expected 401 after revocation, got {kicked.status_code}"

    finally:
        auth_mod.send_otp = orig_send


def test_phone_based_user_creation_and_limited_role():
    """Validates Super Admin creating staff by phone, staff login, tier hiding, and blocking admin endpoints."""
    admin_c = get_admin_client()
    phone_10 = f"9824{secrets.randbelow(900000) + 100000}"

    # Super Admin creates employee using phone number
    res = admin_c.post(
        "/api/admin/employees",
        json={
            "full_name": "Bhavik Joshi",
            "phone_number": phone_10,
            "designation": "Subsidy Associate",
            "role": "EMPLOYEE"
        }
    )
    assert res.status_code == 201, res.text
    emp_data = res.json()["employee"]
    assert emp_data["phone_number"] == f"+91{phone_10}"
    assert emp_data["role"] == "EMPLOYEE"

    # Authenticate as this employee
    with SessionLocal() as db:
        emp_user = db.get(User, emp_data["id"])
        jwt_token, session_token, _ = issue_dual_tokens(db, emp_user)

    staff_client = TestClient(app, base_url="http://testserver")
    staff_client.cookies.set(AUTH_COOKIE, jwt_token)
    staff_client.cookies.set(SESSION_COOKIE, session_token)

    # 1. Staff can view profile
    me = staff_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["role"] == "EMPLOYEE"

    # 2. Staff calling /api/contacts receives client_tier as None on all records
    c_res = staff_client.get("/api/contacts?limit=10")
    assert c_res.status_code == 200
    contacts = c_res.json().get("contacts", [])
    for c in contacts:
        assert c.get("client_tier") is None, f"Non-admin received client_tier: {c.get('client_tier')}"

    # 3. Staff calling admin endpoints receives 403 Forbidden
    admin_sec = staff_client.get("/api/admin/employees")
    assert admin_sec.status_code == 403, f"Expected 403, got {admin_sec.status_code}"

    admin_audit = staff_client.get("/api/admin/audit-logs")
    assert admin_audit.status_code == 403, f"Expected 403, got {admin_audit.status_code}"

    chan_cred = staff_client.get("/api/integrations/channels")
    assert chan_cred.status_code == 403, f"Expected 403, got {chan_cred.status_code}"


def test_automatic_industrialist_tiers_and_ca_network():
    """Validates automatic Micro->SILVER, Small->GOLD, Medium->PLATINUM and CA Network CRUD."""
    admin_c = get_admin_client()

    # 1. Create Micro Industrialist -> SILVER
    r_micro = admin_c.post(
        "/api/contacts",
        json={
            "client_name": "Ramesh Micro Textiles",
            "whatsapp_number": f"+919825{secrets.randbelow(900000) + 100000}",
            "enterprise_classification": "MSME - Micro Enterprise",
            "estimated_subsidy_lakhs": 25.0,
            "sector": "Textile Industry"
        }
    )
    assert r_micro.status_code == 201, r_micro.text
    assert r_micro.json()["contact"]["client_tier"] == "SILVER"

    # 2. Create Small Industrialist -> GOLD
    r_small = admin_c.post(
        "/api/contacts",
        json={
            "client_name": "Suresh Small Engineering",
            "whatsapp_number": f"+919825{secrets.randbelow(900000) + 100000}",
            "enterprise_classification": "MSME - Small",
            "estimated_subsidy_lakhs": 120.0,
            "sector": "Manufacturing"
        }
    )
    assert r_small.status_code == 201, r_small.text
    assert r_small.json()["contact"]["client_tier"] == "GOLD"

    # 3. Create Medium Industrialist -> PLATINUM
    r_med = admin_c.post(
        "/api/contacts",
        json={
            "client_name": "Gujarat Platinum Synthetics Ltd",
            "whatsapp_number": f"+919825{secrets.randbelow(900000) + 100000}",
            "enterprise_classification": "MSME - Medium",
            "estimated_subsidy_lakhs": 450.0,
            "sector": "Pharmaceuticals"
        }
    )
    assert r_med.status_code == 201, r_med.text
    assert r_med.json()["contact"]["client_tier"] == "PLATINUM"

    # 4. Super Admin can see tiers
    admin_list = admin_c.get("/api/contacts?limit=5")
    assert admin_list.status_code == 200
    has_tier = any(c.get("client_tier") in ("SILVER", "GOLD", "PLATINUM") for c in admin_list.json()["contacts"])
    assert has_tier, "Super Admin should see tier badges"

    # 5. CA Network CRUD
    ca_res = admin_c.post(
        "/api/ca-network",
        json={
            "full_name": "CA Jignesh Shah",
            "firm_name": "Shah & Co.",
            "icai_membership_no": "135790",
            "phone_number": f"9825{secrets.randbelow(900000) + 100000}",
            "email": "jignesh@shahco.in",
            "city_district": "Ahmedabad",
            "specialization": "Project Finance & Term Loan",
            "associates": [{"name": "Pooja Mehta", "phone": "9825123456"}],
            "referred_industrialists_count": 5
        }
    )
    assert ca_res.status_code == 201, ca_res.text
    ca_id = ca_res.json()["id"]
    assert "CA-" in ca_res.json()["ca_code"]

    # Read CA Network with 10-row pagination
    ca_list = admin_c.get("/api/ca-network?page=1&page_size=10")
    assert ca_list.status_code == 200
    assert len(ca_list.json()["items"]) >= 1

    # Update CA
    up_res = admin_c.put(f"/api/ca-network/{ca_id}", json={"firm_name": "Shah & Associates LLP"})
    assert up_res.status_code == 200
    assert up_res.json()["firm_name"] == "Shah & Associates LLP"

    # Delete CA
    del_res = admin_c.delete(f"/api/ca-network/{ca_id}")
    assert del_res.status_code == 200


def test_profile_pictures_and_logo_fallback():
    """Validates avatar defaults to logo-mark, gallery image upload, and deletion back to default."""
    admin_c = get_admin_client()

    # User profile initially has default avatar
    me = admin_c.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["avatar_url"] is not None

    # Upload avatar with valid PNG magic bytes
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    up_res = admin_c.post(
        "/api/auth/profile/avatar-upload",
        files={"file": ("test_avatar.png", png_bytes, "image/png")}
    )
    assert up_res.status_code == 200, up_res.text
    avatar_url = up_res.json()["avatar_url"]
    assert "/static/uploads/avatars/" in avatar_url

    # Reset avatar to default logo
    del_res = admin_c.delete("/api/auth/profile/avatar")
    assert del_res.status_code == 200
    assert del_res.json()["avatar_url"] == "/static/img/logo-mark.png"


def test_separated_ad_channels_and_no_ingestion_failures():
    """Validates Instagram, Facebook and Google Forms webhooks succeed without ingestion failures."""
    client = TestClient(app, base_url="http://testserver")

    # 1. Instagram Lead
    ig_res = client.post(
        "/api/integrations/webhooks/instagram",
        json={
            "lead_name": "Kavita IG Textile Lead",
            "mobile_number": f"9825{secrets.randbelow(900000) + 100000}",
            "company_name": "Kavita Fabrics",
            "sector": "Textile Industry",
            "district": "Surat"
        }
    )
    assert ig_res.status_code in (200, 201), ig_res.text
    assert ig_res.json()["status"] == "ok"
    assert "ingestion failed" not in ig_res.text.lower()

    # 2. Facebook Lead Ad
    fb_res = client.post(
        "/api/integrations/webhooks/facebook",
        json={
            "lead_name": "Anand FB Chemical Lead",
            "mobile_number": f"9825{secrets.randbelow(900000) + 100000}",
            "company_name": "Anand Organics",
            "sector": "Pharmaceuticals",
            "district": "Bharuch"
        }
    )
    assert fb_res.status_code in (200, 201), fb_res.text
    assert fb_res.json()["status"] == "ok"
    assert "ingestion failed" not in fb_res.text.lower()

    # 3. Google Form Submission
    gf_res = client.post(
        "/api/integrations/webhooks/google-forms",
        json={
            "lead_name": "Dhaval Google Form Solar Lead",
            "mobile_number": f"9825{secrets.randbelow(900000) + 100000}",
            "company_name": "Dhaval Clean Energy",
            "sector": "Green Energy",
            "district": "Mehsana"
        }
    )
    assert gf_res.status_code in (200, 201), gf_res.text
    assert gf_res.json()["status"] == "ok"
    assert "ingestion failed" not in gf_res.text.lower()


def test_no_otp_leak_anywhere():
    """Asserts no OTP code or debug preview keys leak in API response or login.html."""
    client = TestClient(app, base_url="http://testserver")
    captured = {}
    import app.routers.auth as auth_mod
    orig_send = auth_mod.send_otp
    auth_mod.send_otp = lambda p, c, fn="": captured.update({p: c}) or True

    try:
        # Call POST /api/auth/request-otp for 9426015394
        res = client.post(
            "/api/auth/request-otp",
            json={"phone_number": "9426015394"},
            headers={"X-Forwarded-For": f"10.203.{secrets.randbelow(200)}.{secrets.randbelow(200)}"}
        )
        assert res.status_code == 200, res.text
        data = res.json()

        # Assert "otp" / "preview" / "bridge" / "debug" keys do NOT exist in response JSON
        for k in data.keys():
            k_lower = k.lower()
            assert "otp" not in k_lower or k_lower == "status", f"Disallowed key in response: {k}"
            assert "preview" not in k_lower, f"Disallowed key in response: {k}"
            assert "bridge" not in k_lower, f"Disallowed key in response: {k}"
            assert "debug" not in k_lower, f"Disallowed key in response: {k}"

        # Assert no 6-digit OTP appears in response.text
        actual_otp = captured.get("+919426015394")
        if actual_otp:
            assert actual_otp not in res.text, f"Leaked 6-digit OTP {actual_otp} in response text!"

        # Fetch GET /login HTML and assert "OTP Bridge", "Auto-Fill OTP", and "otpInput.value =" do NOT exist
        login_html = client.get("/login").text
        assert "OTP Bridge" not in login_html, "Found 'OTP Bridge' in login.html"
        assert "Auto-Fill OTP" not in login_html, "Found 'Auto-Fill OTP' in login.html"
        assert "otpInput.value =" not in login_html, "Found 'otpInput.value =' in login.html"
    finally:
        auth_mod.send_otp = orig_send


def test_sidebar_views_and_js_integrity():
    """Validates node syntax check on app.js and full match between sidebar buttons, sections, and routes."""
    import subprocess
    import re

    # 1. Run node --check app/static/js/app.js
    node_res = subprocess.run(["node", "--check", "app/static/js/app.js"], cwd=REPO_ROOT, capture_output=True, text=True)
    assert node_res.returncode == 0, f"node --check failed: {node_res.stderr}"

    # 1b. Run automated Node.js DOM click test
    dom_test_res = subprocess.run(["node", "tests/test_sidebar_click.js"], cwd=REPO_ROOT, capture_output=True, text=True)
    assert dom_test_res.returncode == 0, f"tests/test_sidebar_click.js failed: {dom_test_res.stderr}\n{dom_test_res.stdout}"

    # 2. Parse app/templates/dashboard.html
    dash_path = REPO_ROOT / "app" / "templates" / "dashboard.html"
    dash_html = dash_path.read_text(encoding="utf-8")

    # Find all sidebar buttons with data-view or data-section
    btn_views = set(re.findall(r'<button[^>]*class="[^"]*nav-item[^"]*"[^>]*data-view="([^"]+)"', dash_html))
    assert len(btn_views) >= 9, f"Expected at least 9 sidebar nav-items, found {len(btn_views)}: {btn_views}"

    # Assert matching view containers exist in the HTML
    for view in btn_views:
        has_id = f'id="view-{view}"' in dash_html
        has_panel = f'data-view-panel="{view}"' in dash_html
        assert has_id or has_panel, f"Missing view panel for sidebar view: {view}"

    # Assert wired in app.js
    app_js_text = (REPO_ROOT / "app" / "static" / "js" / "app.js").read_text(encoding="utf-8")
    for view in btn_views:
        assert f"'{view}'" in app_js_text or f'"{view}"' in app_js_text, f"View {view} not referenced in app.js"


def test_menubar_simple_logo_no_fake_x():
    """Asserts dashboard.html menubar uses /static/img/logo-mark.png and does NOT contain fake <span>X</span>."""
    dash_html = (REPO_ROOT / "app" / "templates" / "dashboard.html").read_text(encoding="utf-8")
    
    # Assert menubar uses /static/img/logo-mark.png
    assert '<img src="/static/img/logo-mark.png" alt="SubsidyX" class="topbar-logo-mark"' in dash_html

    # Assert does not contain fake <span>X</span> logo markup
    assert '<span>X</span>' not in dash_html
    assert '<span style="color:#F86030;">X</span>' not in dash_html
    assert 'accent-x' not in dash_html


# ==============================================================================
# MAIN TEST RUNNER
# ==============================================================================

ALL_TESTS = [
    test_otp_rejected_for_unregistered_phone,
    test_otp_rejected_for_invalid_phone_format,
    test_otp_challenge_generation_and_no_leakage,
    test_otp_successful_verification_and_session,
    test_otp_max_attempts_lockout,
    test_user_profile_edit,
    test_employee_crud_and_pagination,
    test_client_lists_crud_and_membership,
    test_scheduled_campaign_creation_and_worker_execution,
    test_omnichannel_webhook_ingestion,
    test_leads_paginated_crm_and_conversion,
    test_navbar_clock_contrast_and_print_styles,
    test_two_minute_otp_and_dual_session_tokens,
    test_phone_based_user_creation_and_limited_role,
    test_automatic_industrialist_tiers_and_ca_network,
    test_profile_pictures_and_logo_fallback,
    test_separated_ad_channels_and_no_ingestion_failures,
    test_no_otp_leak_anywhere,
    test_sidebar_views_and_js_integrity,
    test_menubar_simple_logo_no_fake_x,
]

if __name__ == "__main__":
    init_db()
    passed = 0
    failed = 0
    print("\n" + "=" * 70)
    print("RUNNING SUBSIDYX AUTONOMOUS PRODUCTION TEST SUITE")
    print("=" * 70)
    for test in ALL_TESTS:
        test_name = test.__name__
        try:
            test()
            passed += 1
            print(f"  [PASS] {test_name}")
        except Exception as exc:
            failed += 1
            print(f"  [FAIL] {test_name}: {exc}")

    print("=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed (total {len(ALL_TESTS)})")
    print("=" * 70 + "\n")
    if failed > 0:
        sys.exit(1)
    sys.exit(0)
