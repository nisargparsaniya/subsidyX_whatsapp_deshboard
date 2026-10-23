#!/usr/bin/env python3
"""End-to-end demo verification for the SubsidyX In-House WhatsApp Command Center.

Run the app first, then:

    uvicorn app.main:app --port 8000
    python verify_demo_ready.py

The script is repeatable: every row it creates is deleted again, and the final step
re-seeds the presentation showcase, so the database is demo-ready when it exits 0.
"""
import os
import time
from typing import Any

import httpx

BASE = os.getenv("SUBSIDYX_BASE_URL", "http://127.0.0.1:8000")


class SubsidyXVerifier:
    def __init__(self) -> None:
        self.client = httpx.Client(base_url=BASE, timeout=30.0, follow_redirects=True)

    def login(self, username: str, password: str, headers: dict[str, str] | None = None) -> tuple[int, dict[str, Any]]:
        resp = self.client.post(
            "/api/auth/login", json={"username": username, "password": password}, headers=headers or {}
        )
        try:
            body = resp.json()
        except Exception:
            body = {"raw": resp.text}
        return resp.status_code, body

    def logout_clear(self) -> None:
        self.client.cookies.clear()

    def api(self, method: str, path: str, **kwargs) -> tuple[int, Any]:
        resp = self.client.request(method, path, **kwargs)
        try:
            body = resp.json()
        except Exception:
            body = resp.text
        return resp.status_code, body


def section(title: str) -> None:
    print(f"\n{'=' * 70}\n{title}\n{'=' * 70}")


def main() -> int:
    v = SubsidyXVerifier()
    ok = 0
    fail = 0

    def check(name: str, cond: bool, detail: str = "") -> None:
        nonlocal ok, fail
        if cond:
            ok += 1
            print(f"  [PASS] {name} {detail}")
        else:
            fail += 1
            print(f"  [FAIL] {name} {detail}")

    try:
        v.client.get("/api/health")
    except httpx.HTTPError as exc:
        print(f"Server unreachable at {BASE} ({exc.__class__.__name__}).")
        print("Start it first:  uvicorn app.main:app --port 8000")
        return 2

    section("1) Super Admin Logins (auto-identified by server)")
    for u, p, full in [
        ("nisarg", "Nisarg@2026", "Nisarg Parsaniya"),
        ("gajendra", "Gajendra@2026", "Gajendra Jain"),
        ("abhishek", "Abhishek@2026", "CA Abhishek Jain"),
    ]:
        v.logout_clear()
        code, body = v.login(u, p)
        user = (body.get("user") or {}) if isinstance(body, dict) else {}
        check(
            f"login {u}",
            code == 200 and user.get("role") == "ADMIN" and user.get("full_name") == full,
            f"code={code} role={user.get('role')}",
        )
        code2, me = v.api("GET", "/api/auth/me")
        check(f"/api/auth/me for {u}", code2 == 200 and (me.get("user") or {}).get("role") == "ADMIN", f"code={code2}")

    v.logout_clear()
    for path in ["/api/whatsapp/threads", "/api/contacts", "/api/admin/audit-logs"]:
        code, _ = v.api("GET", path)
        check(f"anonymous {path} rejected", code == 401, f"code={code}")

    section("2) Employee creation & deletion by Admin + IP audit")
    v.logout_clear()
    v.login("nisarg", "Nisarg@2026")
    code, body = v.api("POST", "/api/admin/employees", json={"full_name": "VerifyDemo Exec", "designation": "Demo QA"})
    emp = (body.get("employee") or {}) if isinstance(body, dict) else {}
    eid = emp.get("id")
    uname = emp.get("username")
    check("create employee (Admin)", code == 201 and eid and uname, f"code={code} username={uname}")
    code, alogs = v.api("GET", "/api/admin/audit-logs?limit=50")
    logs = (alogs.get("logs") or []) if isinstance(alogs, dict) else []
    success = next((log for log in logs if log.get("username_attempted") == "nisarg" and log.get("status") == "SUCCESS"), None)
    check(
        "login_audit_logs records IP + role + IST timestamp",
        bool(success) and success.get("ip_address") and success.get("timestamp_ist") and success.get("role_detected") == "ADMIN",
        f"count={len(logs)} ip={success.get('ip_address') if success else None}",
    )
    if eid:
        code, delr = v.api("DELETE", f"/api/admin/employees/{eid}")
        check("delete employee (Admin)", code == 200, f"code={code}")

    section("3) Login Rate Limiter (5 failed -> 6th blocked HTTP 429)")
    v.logout_clear()
    # Probe as a throwaway client IP + unique Employee ID: the shield counts failures per
    # IP and per username, so this keeps the office IP clean and the script repeatable.
    stamp = int(time.time())
    probe_user = f"rate_probe_{stamp}"
    attacker = {"X-Forwarded-For": f"198.51.100.{stamp % 200 + 1}"}
    for i in range(6):
        code, body = v.login(probe_user, "definitely_wrong_password", headers=attacker)
        detail = (body.get("detail") or "") if isinstance(body, dict) else str(body)
        if i < 5:
            check(f"failed attempt {i + 1}", code == 401, f"code={code}")
        else:
            check(
                f"attempt {i + 1} blocked by rate limiter",
                code == 429 and "15 minutes" in detail,
                f"code={code} detail={detail[:60]}",
            )
    v.logout_clear()
    code, body = v.login("nisarg", "Nisarg@2026")
    check("a different client IP is not locked out", code == 200, f"code={code}")

    section("4) Mobile .vcf/.csv contact import & export")
    csv_data = (
        "client_name,whatsapp_number,company_name,district,sector,estimated_subsidy_lakhs\n"
        "Verify A,+919111111111,Verify A Ltd,Ahmedabad,Textile Industry,50\n"
        "Verify B,+919222222222,Verify B LLP,Surat,Pharmaceuticals,75\n"
    )
    resp = v.client.post(
        "/api/contacts/import", params={"auto_welcome": "false"}, files={"file": ("verify.csv", csv_data.encode(), "text/csv")}
    )
    body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    check("import .csv", resp.status_code == 200 and body.get("created") >= 2, f"status={resp.status_code} created={body.get('created')}")

    vcf_data = (
        "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Parmar;Jignesh;;;\r\nFN:Jignesh Parmar\r\n"
        "ORG:Parmar Polymers\r\nTEL;TYPE=CELL:+919444444444\r\nEMAIL:jignesh@parmarpolymers.in\r\nEND:VCARD\r\n"
    )
    resp = v.client.post(
        "/api/contacts/import", params={"auto_welcome": "false"}, files={"file": ("verify.vcf", vcf_data.encode(), "text/vcf")}
    )
    vcf_body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    check("import .vcf (mobile contacts)", resp.status_code == 200 and vcf_body.get("created") >= 1, f"status={resp.status_code} created={vcf_body.get('created')}")

    for fmt in ["csv", "xlsx", "vcf"]:
        resp = v.client.get(f"/api/contacts/export?format={fmt}")
        check(f"export .{fmt}", resp.status_code == 200 and len(resp.content) > 10, f"ct={resp.headers.get('content-type')} len={len(resp.content)}")
    for fmt in ["csv", "vcf"]:
        resp = v.client.get(f"/api/contacts/sample-template?format={fmt}")
        check(f"sample template .{fmt}", resp.status_code == 200 and len(resp.content) > 5, f"len={len(resp.content)}")

    test_ids = [c["id"] for c in (body.get("contacts") or []) + (vcf_body.get("contacts") or []) if c.get("id")]
    removed = sum(1 for cid in test_ids if v.api("DELETE", f"/api/contacts/{cid}")[0] == 200)
    check("imported test contacts removed again", bool(test_ids) and removed == len(test_ids), f"removed={removed}/{len(test_ids)}")

    section("5) Template create, campaign launch, chatbot auto-reply")
    code, templates = v.api("GET", "/api/templates")
    check("list templates", code == 200, f"code={code}")
    code, body = v.api(
        "POST",
        "/api/templates",
        json={
            "template_name": "Verify Demo Template",
            "category": "MARKETING",
            "body_text": "Hello {{client_name}}, verify demo.",
            "footer_text": "SubsidyX",
        },
    )
    tid = (body.get("template") or {}).get("id") if isinstance(body, dict) else None
    check("create template", code == 201 and tid, f"code={code}")
    code, body = v.api("POST", "/api/campaigns/launch", json={"campaign_name": "Verify Demo Campaign", "template_id": tid, "segment": "ALL"})
    cid = (body.get("campaign") or {}).get("id") if isinstance(body, dict) else None
    msg = body.get("message") if isinstance(body, dict) else body
    check("launch bulk campaign", code == 201 and cid, f"code={code} msg={str(msg)[:60]}")
    if cid:
        code, body = v.api("POST", f"/api/campaigns/{cid}/advance-delivery")
        check("advance campaign delivery", code == 200, f"code={code}")
        v.api("DELETE", f"/api/campaigns/{cid}")
    if tid:
        v.api("DELETE", f"/api/templates/{tid}")
    code, body = v.api(
        "POST",
        "/api/chatbot/simulate-inbound",
        json={
            "message": "I want subsidy eligibility for textile unit",
            "whatsapp_number": "+919333333333",
            "client_name": "Verify Chatbot HNI",
        },
    )
    reply = (body.get("reply") or {}) if isinstance(body, dict) else {}
    flow = (body.get("matched_flow") or {}) if isinstance(body, dict) else {}
    check(
        "chatbot auto-reply simulation",
        code == 200 and bool(reply.get("body")) and bool(flow.get("bot_name")),
        f"matched={flow.get('bot_name')} reply_len={len(reply.get('body', ''))}",
    )
    probe_contact = (body.get("contact") or {}).get("id") if isinstance(body, dict) else None
    if probe_contact:
        v.api("DELETE", f"/api/contacts/{probe_contact}")

    section("6) Meta API Mock -> LIVE cutover (purge is_mock) + restore demo")
    code, mode = v.api("GET", "/api/whatsapp/mode")
    check("mode endpoint", code == 200 and mode.get("whatsapp_mode") == "MOCK", f"mode={mode.get('whatsapp_mode')}")
    credentials = {
        "meta_phone_number_id": "123456789012345",
        "meta_waba_id": "109876543210987",
        "meta_access_token": "EAABsbQZCZA1234567890abcdefgh",
    }
    code, body = v.api("POST", "/api/whatsapp/connect-meta-api", json=credentials)
    purged = (body.get("purged") or {}) if isinstance(body, dict) else {}
    check(
        "connect Meta API (purge mock + switch LIVE)",
        code == 200 and body.get("whatsapp_mode") == "LIVE" and sum(purged.values()) > 0,
        f"code={code} purged={purged}",
    )
    code, mode = v.api("GET", "/api/whatsapp/mode")
    rows = mode.get("presentation_rows") or {}
    check(
        "LIVE mode keeps zero presentation rows",
        code == 200 and mode.get("whatsapp_mode") == "LIVE" and not rows.get("contacts") and not rows.get("messages"),
        f"rows={rows}",
    )
    code, body = v.api("POST", "/api/whatsapp/reset-demo-mock")
    seeded = (body.get("seeded") or {}) if isinstance(body, dict) else {}
    check("restore demo mock data", code == 200 and body.get("whatsapp_mode") == "MOCK" and seeded.get("seeded"), f"seeded={seeded}")
    code, mode = v.api("GET", "/api/whatsapp/mode")
    rows = mode.get("presentation_rows") or {}
    check(
        "back to MOCK with the full showcase seeded",
        code == 200 and rows.get("contacts", 0) >= 10 and rows.get("templates", 0) >= 5 and rows.get("campaigns", 0) >= 3,
        f"rows={rows}",
    )

    section("7) Demo readiness (no verification leftovers)")
    _, contacts = v.api("GET", "/api/contacts?limit=500")
    names = [c.get("client_name", "") for c in (contacts.get("contacts") or [])]
    check("contact book has no test rows", not [n for n in names if n.startswith(("Verify", "Jignesh"))], f"contacts={len(names)}")
    _, templates = v.api("GET", "/api/templates")
    _, campaigns = v.api("GET", "/api/campaigns")
    _, flows = v.api("GET", "/api/chatbot/flows")
    check(
        "showcase content present (templates / campaigns / chatbot flows)",
        len(templates.get("templates") or []) >= 5
        and len(campaigns.get("campaigns") or []) >= 3
        and len(flows.get("flows") or []) >= 6,
        f"templates={len(templates.get('templates') or [])} campaigns={len(campaigns.get('campaigns') or [])} flows={len(flows.get('flows') or [])}",
    )
    _, mode = v.api("GET", "/api/whatsapp/mode")
    check("presentation mode is MOCK", mode.get("whatsapp_mode") == "MOCK", f"mode={mode.get('whatsapp_mode')}")

    print(f"\n{'=' * 70}\nRESULT: {ok} PASSED / {fail} FAILED\n{'=' * 70}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
