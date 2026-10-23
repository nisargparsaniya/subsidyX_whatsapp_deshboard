#!/usr/bin/env python3
"""End-to-end demo verification for the SubsidyX In-House WhatsApp Command Center."""
import json
import os
import sys
from typing import Any

import httpx

BASE = os.getenv("SUBSIDYX_BASE_URL", "http://127.0.0.1:8000")


class SubsidyXVerifier:
    def __init__(self) -> None:
        self.client = httpx.Client(base_url=BASE, timeout=30.0, follow_redirects=True)

    def login(self, username: str, password: str) -> tuple[int, dict[str, Any]]:
        resp = self.client.post("/api/auth/login", json={"username": username, "password": password})
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

    section("1) Super Admin Logins (auto-identified by server)")
    for u, p, full in [
        ("nisarg", "Nisarg@2026", "Nisarg Parsaniya"),
        ("gajendra", "Gajendra@2026", "Gajendra Jain"),
        ("abhishek", "Abhishek@2026", "CA Abhishek Jain"),
    ]:
        v.logout_clear()
        code, body = v.login(u, p)
        user = (body.get("user") or {}) if isinstance(body, dict) else {}
        check(f"login {u}", code == 200 and user.get("role") == "ADMIN" and user.get("full_name") == full, f"code={code} role={user.get('role')}")
        code2, me = v.api("GET", "/api/auth/me")
        check(f"/api/auth/me for {u}", code2 == 200 and (me.get("user") or {}).get("role") == "ADMIN", f"code={code2}")

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
    ips = [l.get("ip_address") for l in logs]
    has_success = any(l.get("status") == "SUCCESS" and l.get("username_attempted") == "nisarg" for l in logs)
    check("login_audit_logs has SUCCESS with IP/timestamp/role", has_success and any(ips), f"count={len(logs)} sample_ip={ips[0] if ips else None}")
    if eid:
        code, delr = v.api("DELETE", f"/api/admin/employees/{eid}")
        check("delete employee (Admin)", code == 200, f"code={code}")

    section("3) Login Rate Limiter (5 failed -> 6th blocked HTTP 429)")
    v.logout_clear()
    for i in range(6):
        code, body = v.login("rate_test_user", "definitely_wrong_password")
        detail = (body.get("detail") or "") if isinstance(body, dict) else str(body)
        if i < 5:
            check(f"failed attempt {i+1}", code == 401, f"code={code}")
        else:
            check(f"attempt {i+1} blocked by rate limiter", code == 429 and "15 minutes" in detail, f"code={code} detail={detail[:60]}")

    section("4) Mobile .vcf/.csv contact import & export")
    v.logout_clear()
    v.login("nisarg", "Nisarg@2026")
    csv_data = "client_name,whatsapp_number,company_name,district,sector,estimated_subsidy_lakhs\nVerify A,+919111111111,Verify A Ltd,Ahmedabad,Textile Industry,50\nVerify B,+919222222222,Verify B LLP,Surat,Pharmaceuticals,75\n"
    files = {"file": ("verify.csv", csv_data.encode(), "text/csv")}
    resp = v.client.post("/api/contacts/import?auto_welcome=false", files=files)
    body = resp.json() if resp.headers.get("content-type","").startswith("application/json") else resp.text
    check("import .csv", resp.status_code == 200 and isinstance(body, dict) and body.get("created") >= 2, f"status={resp.status_code} body={str(body)[:80]}")
    for fmt in ["csv", "xlsx", "vcf"]:
        resp = v.client.get(f"/api/contacts/export?format={fmt}")
        check(f"export .{fmt}", resp.status_code == 200 and len(resp.content) > 10, f"ct={resp.headers.get('content-type')} len={len(resp.content)}")
    for fmt in ["csv", "vcf"]:
        resp = v.client.get(f"/api/contacts/sample-template?format={fmt}")
        check(f"sample template .{fmt}", resp.status_code == 200 and len(resp.content) > 5, f"len={len(resp.content)}")

    section("5) Template create, campaign launch, chatbot auto-reply")
    code, templates = v.api("GET", "/api/templates")
    check("list templates", code == 200, f"code={code}")
    code, body = v.api("POST", "/api/templates", json={"template_name": "Verify Demo Template", "category": "MARKETING", "body_text": "Hello {{client_name}}, verify demo.", "footer_text": "SubsidyX"})
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
    code, body = v.api("POST", "/api/chatbot/simulate-inbound", json={"message": "I want subsidy eligibility for textile unit", "whatsapp_number": "+919333333333", "client_name": "Verify Chatbot HNI"})
    reply = (body.get("reply") or {}) if isinstance(body, dict) else {}
    flow = (body.get("matched_flow") or {}) if isinstance(body, dict) else {}
    check("chatbot auto-reply simulation", code == 200 and reply.get("body"), f"matched={flow.get('bot_name')} reply_len={len(reply.get('body',''))}")

    section("6) Meta API Mock -> LIVE cutover (purge is_mock) + restore demo")
    code, mode = v.api("GET", "/api/whatsapp/mode")
    check("mode endpoint", code == 200, f"mode={mode.get('whatsapp_mode')}")
    p = {"meta_phone_number_id": "123456789012345", "meta_waba_id": "109876543210987", "meta_access_token": "EAABsbQZCZA1234567890abcdefgh"}
    code, body = v.api("POST", "/api/whatsapp/connect-meta-api", json=p)
    purged = (body.get("purged") or {}) if isinstance(body, dict) else {}
    check("connect Meta API (purge + LIVE)", code == 200 and body.get("whatsapp_mode") == "LIVE", f"code={code} purged={purged}")
    code, mode = v.api("GET", "/api/whatsapp/mode")
    check("LIVE mode confirmed", code == 200 and mode.get("whatsapp_mode") == "LIVE", f"rows={mode.get('presentation_rows')}")
    code, body = v.api("POST", "/api/whatsapp/reset-demo-mock")
    seeded = (body.get("seeded") or {}) if isinstance(body, dict) else {}
    check("restore demo mock data", code == 200 and body.get("whatsapp_mode") == "MOCK", f"seeded={seeded}")
    code, mode = v.api("GET", "/api/whatsapp/mode")
    check("back to MOCK with seeded data", code == 200 and mode.get("presentation_rows",{}).get("contacts") >= 10, f"rows={mode.get('presentation_rows')}")

    print(f"\n{'=' * 70}\nRESULT: {ok} PASSED / {fail} FAILED\n{'=' * 70}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
