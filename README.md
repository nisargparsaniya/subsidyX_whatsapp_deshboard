# SubsidyX — In-House WhatsApp Marketing, Chatbot & HNI Command Center

Internal command center for the SubsidyX subsidy-advisory desk. Admins, Chartered
Accountants and Relationship Managers manage Gujarat HNI (high-net-worth) clients,
run WhatsApp bulk campaigns, and let the rule-based chatbot answer inbound messages.

> **HNI clients never log in.** This platform is strictly internal. The only accounts are
> SubsidyX staff, and every session is a JWT in an HttpOnly cookie.

| | |
|---|---|
| **Stack** | Python 3.11+ · FastAPI · SQLAlchemy 2.0 (2.1.6) · Pydantic v2 · Jinja2 + vanilla JS/Chart.js |
| **Database** | PostgreSQL 17 primary, automatic SQLite failover so the demo never dies |
| **WhatsApp** | MOCK presentation mode (default) ↔ official Meta WhatsApp Cloud API |
| **Verification** | `verify_demo_ready.py` — 40 end-to-end checks, exits `0` only when demo-ready |

---

## 1. What is inside

Six self-explanatory modules behind one login:

| # | Module | What it does |
|---|---|---|
| 1 | 📊 **Executive Overview** | KPI cards (HNI contacts, ₹ pipeline, delivery rate, chatbot resolution) + Chart.js sector pipeline and engagement funnel |
| 2 | 💬 **Live Inbox & Chatbot Simulator** | Three-pane WhatsApp inbox, template picker, manual composer, one-click "simulate incoming client message" |
| 3 | 📇 **Contact Hub** | Drag-and-drop `.vcf` / `.csv` / `.xlsx` / `.json` import, duplicate-phone dedupe, 1-click export to CSV/Excel/mobile vCard, sample templates |
| 4 | 📣 **Templates & Bulk Marketing** | Template builder with `{{client_name}}`, `{{company_name}}`, `{{subsidy_amount}}`… variables, segment targeting, live delivery metrics |
| 5 | 🤖 **Custom Chatbot Builder** | Keyword / button / first-touch / fallback flows → text, template or interactive-menu replies, hit counters, auto-tagging |
| 6 | 🛡️ **Admin & Security Vault** | Employee credential issuing, live login audit with client IP + IST time, Meta API cutover panel |

Cross-cutting: every view renders a `.skeleton-shimmer` placeholder first, fonts are
Plus Jakarta Sans / Inter / JetBrains Mono, palette navy `#191A47` + orange `#F26722`.

---

## 2. Architecture

```
                    ┌──────────────────────────────────────────────┐
  Browser  ────────▶│  Jinja2 pages: /login  /dashboard             │
  (staff only)      │  app/static/js/app.js  ·  custom.css         │
                    └───────────────┬──────────────────────────────┘
                                    │  fetch() + HttpOnly JWT cookie
                    ┌───────────────▼──────────────────────────────┐
                    │  FastAPI routers  (app/routers)              │
                    │  auth · admin_users · contacts ·             │
                    │  campaigns_templates · chatbot · whatsapp     │
                    │  ── RBAC: get_current_user / require_admin ── │
                    └───────────────┬──────────────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────────────┐
                    │  Services (app/services)                     │
                    │  security   · contact_io  (vcf/csv/xlsx/json) │
                    │  whatsapp_engine (render, delivery, chatbot)  │
                    │  mock_seeder (Gujarat showcase + purge)       │
                    └───────────────┬──────────────────────────────┘
                                    │  SQLAlchemy 2.0 ORM
                    ┌───────────────▼──────────────────────────────┐
                    │  PostgreSQL 17  ──failover──▶  SQLite file   │
                    └──────────────────────────────────────────────┘
```

**Tables.** `users`, `login_audit_logs`, `hni_contacts`, `whatsapp_templates`,
`bulk_campaigns`, `whatsapp_messages`, `chatbot_flows`, `system_settings`.

Every presentation row carries `is_mock = True`. That single flag is what makes the
one-click Meta cutover possible: `DELETE … WHERE is_mock = TRUE` across
`whatsapp_messages → bulk_campaigns → chatbot_flows → whatsapp_templates → hni_contacts`,
then the platform flips to `LIVE` and only genuine records remain.

---

## 3. Credentials (seeded on first start)

| Employee ID | Name | Role | Password | Designation |
|---|---|---|---|---|
| `nisarg` | Nisarg Parsaniya | `ADMIN` | `Nisarg@2026` | System Architect & Super Admin |
| `gajendra` | Gajendra Jain | `ADMIN` | `Gajendra@2026` | Managing Director & Super Admin |
| `abhishek` | CA Abhishek Jain | `ADMIN` | `Abhishek@2026` | Principal Chartered Accountant & Super Admin |
| `emp_rahul` | Rahul Desai | `EMPLOYEE` | `Rahul@2026` | Subsidy Relationship Executive |

- Passwords are bcrypt-hashed; the hash never leaves the server (`User.public()`).
- Role is detected **server-side** on login — a client cannot ask to be an admin.
- Only Admins may create/revoke employees, read `login_audit_logs`, or submit Meta keys.
- Change these before any real deployment: edit `SEED_USERS` in `app/models/user.py`,
  or issue new employees from the Security Vault.

Seeding is idempotent: existing usernames are skipped, so re-starting never duplicates
or resets accounts.

---

## 4. Quick start

```powershell
# Windows (PowerShell) — from the project root
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

Copy-Item .env.example .env        # then edit DATABASE_URL / secrets
uvicorn app.main:app --port 8000   # http://127.0.0.1:8000  →  /login
```

```bash
# macOS / Linux
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --port 8000
```

Tables, the four accounts and the presentation showcase are created on startup
(`init_db()` in the FastAPI lifespan) — no migration step needed for the demo.

Health probe: `GET /api/health` → `{"status":"ok","database_engine":"PostgreSQL 17","whatsapp_mode":"MOCK"}`.

---

## 5. PostgreSQL 17 setup

The app connects to `DATABASE_URL`, proves the connection with `SELECT 1` (2 s timeout),
and only then uses it. If that fails it falls back to `sqlite:///./subsidyx_inhouse.db`
and reports *PostgreSQL-Compatible Local Engine* in `/api/health`, so a demo can never
hard-crash on a missing service.

```sql
-- once, as the postgres superuser
CREATE DATABASE subsidyx_whatsapp;
-- optional: a dedicated role instead of postgres/postgres
CREATE ROLE subsidyx WITH LOGIN PASSWORD 'change-me';
GRANT ALL PRIVILEGES ON DATABASE subsidyx_whatsapp TO subsidyx;
```

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/subsidyx_whatsapp"
# or, with the dedicated role:
# DATABASE_URL="postgresql://subsidyx:change-me@localhost:5432/subsidyx_whatsapp"
```

Notes:

- Bare `postgresql://` URLs are rewritten to `postgresql+psycopg2://` (the project ships
  `psycopg2-binary`), so either form works.
- Check the service: `Get-Service *postgres*` (Windows) / `pg_isready` (Linux).
  On Windows the default port is 5432; the Postgres installer usually sets a password
  for the `postgres` role during setup.
- Do **not** commit `.env` — it is git-ignored; only `.env.example` is tracked.
- Migrations are out of scope for the demo (`create_all` creates missing tables). For
  production, add Alembic before changing any model.

---

## 6. Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PROJECT_NAME` | SubsidyX In-House WhatsApp & Campaign Command Center | Shown in `/api/health` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/subsidyx_whatsapp` | Primary DB; falls back to SQLite |
| `SECRET_KEY` | (demo value) | JWT signing key — replace for production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | Session lifetime (12 h) |
| `WHATSAPP_MODE` | `MOCK` | Seed value only; the live switch lives in `system_settings` |
| `META_GRAPH_API_VERSION` | `v21.0` | Graph API version for the live integration |
| `META_VERIFY_TOKEN` | `subsidyx_meta_verify_2026` | Webhook challenge token (stored value wins over `.env`) |

The active mode is persisted in `system_settings`, not in `.env`, so a cutover survives
restarts.

---

## 7. Meta WhatsApp Cloud API — setup & webhook

### 7.1 Collect the three values

1. **Meta for Developers** → create/select an app → add the **WhatsApp** product.
2. Copy **Phone Number ID** and **WhatsApp Business Account ID (WABA ID)** from
   *WhatsApp → API Setup*.
3. Create a **System User** (Business Settings → Users → System users), grant it the
   `whatsapp_business_messaging` + `whatsapp_business_management` permissions, and
   generate a permanent **Access Token**.

### 7.2 Expose the webhook

Meta needs a public HTTPS URL. For a local/laptop demo use a tunnel:

```bash
ngrok http 8000          # or: cloudflared tunnel --url http://localhost:8000
# → https://<random>.ngrok-free.app  (callback URL = that host + /api/whatsapp/webhook)
```

### 7.3 Register the callback (Meta App Dashboard)

*WhatsApp → Configuration → Webhook → Edit*:

| Field | Value |
|---|---|
| Callback URL | `https://<your-public-host>/api/whatsapp/webhook` |
| Verify token | the `META_VERIFY_TOKEN` value (`subsidyx_meta_verify_2026` by default) |

Click **Verify and save**. Meta sends
`GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`;
the app echoes `hub.challenge` only when the token matches, otherwise `403`.
Then subscribe to the **messages** field (delivery/read statuses arrive in the same hook).

```bash
# manual smoke test
curl "http://127.0.0.1:8000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=subsidyx_meta_verify_2026&hub.challenge=12345"
# → 12345
```

### 7.4 Cut over from MOCK to LIVE

Admin → **Security Vault → Meta Official API Cutover**, or:

```bash
curl -X POST http://127.0.0.1:8000/api/whatsapp/connect-meta-api \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"meta_phone_number_id":"…","meta_waba_id":"…","meta_access_token":"EAAG…"}'
```

Result: every `is_mock = True` row is purged, credentials are stored in
`system_settings`, mode becomes `LIVE`, and only real records remain.

`POST /api/whatsapp/reset-demo-mock` (Admin) is the rehearsal switch: purge mock rows,
flip back to `MOCK`, re-seed the Gujarat showcase in one call.

**Inbound events** handled by `POST /api/whatsapp/webhook`: message statuses
(`sent`/`delivered`/`read`/`failed`) update the matching `whatsapp_messages` row and
refresh campaign counters; inbound texts create an HNI contact when unknown, run the
chatbot matcher, store the auto-reply and tag the lead.

**Outbound, currently:** the platform persists outbound messages and simulates delivery
in `MOCK`. Wiring the actual Graph API `POST /{phone_number_id}/messages` call (plus a
retry queue) is the remaining production step — see *Known limitations*.

---

## 8. Verify the demo

With the server running:

```powershell
.\venv\Scripts\python.exe verify_demo_ready.py
```

Exit code `0` means demo-ready; `1` means at least one check failed; `2` means the
server was unreachable. Point it elsewhere with `SUBSIDYX_BASE_URL`.

What it proves, in order:

1. All three Super Admins log in and are auto-identified as `ADMIN`.
2. Anonymous calls to the inbox / contacts / audit endpoints are rejected (`401`).
3. Admin creates and deletes an employee; `login_audit_logs` holds a `SUCCESS` row with
   client IP, detected role and IST timestamp.
4. Five bad passwords → the sixth attempt is `429 “Security Shield … 15 minutes”`.
   The probe runs from a throwaway client IP, and a check asserts a different IP is
   **not** locked out.
5. `.csv` **and** `.vcf` imports, plus `.csv` / `.xlsx` / `.vcf` exports and both sample
   templates; the imported test rows are then deleted again.
6. Template creation, a bulk campaign to all opted-in clients, delivery advancement, and
   a chatbot simulation that returns the *Subsidy Eligibility Advisor* reply.
7. Meta cutover purges all mock rows → `LIVE` with zero presentation rows → demo restore
   re-seeds 10 contacts / 5 templates / 6 flows / 3 campaigns / 27 messages.
8. Final sweep: no `Verify*` leftovers, showcase content present, mode back to `MOCK`.

The script is repeatable — every row it creates is removed again, and it ends by
restoring the presentation dataset.

---

## 9. API map (all JSON unless noted)

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` |
| Admin | `GET/POST /api/admin/employees` · `PATCH /api/admin/employees/{id}/access` · `DELETE /api/admin/employees/{id}` · `GET /api/admin/audit-logs` |
| Contacts | `GET/POST /api/contacts` · `GET/PATCH/DELETE /api/contacts/{id}` · `GET /api/contacts/segments` · `GET /api/contacts/stats` · `POST /api/contacts/import` (multipart) · `GET /api/contacts/export?format=csv\|xlsx\|vcf` · `GET /api/contacts/sample-template?format=csv\|vcf` |
| Templates | `GET/POST /api/templates` · `GET/PATCH/DELETE /api/templates/{id}` · `GET /api/templates/{id}/preview` · `POST /api/templates/{id}/set-welcome-default` |
| Campaigns | `GET /api/campaigns` · `POST /api/campaigns/launch` · `GET/DELETE /api/campaigns/{id}` · `POST /api/campaigns/{id}/advance-delivery` |
| Chatbot | `GET/POST /api/chatbot/flows` · `PATCH/DELETE /api/chatbot/flows/{id}` · `POST /api/chatbot/flows/{id}/toggle` · `POST /api/chatbot/simulate-inbound` |
| WhatsApp | `GET /api/whatsapp/mode` · `GET /api/whatsapp/threads` · `GET /api/whatsapp/messages/{contact_id}` · `POST /api/whatsapp/threads/{id}/read` · `POST /api/whatsapp/send` · `GET/POST /api/whatsapp/webhook` · `POST /api/whatsapp/connect-meta-api` · `POST /api/whatsapp/reset-demo-mock` |
| Pages | `GET /login` · `GET /dashboard` · `GET /api/health` |

Auth is a HttpOnly cookie named `subsidyx_token`; a `Bearer` header also works for
scripted calls. Every endpoint except `/api/auth/login`, `/api/health`, the pages and the
Meta webhook requires a session; admin endpoints additionally require `role == ADMIN`.

---

## 10. Security notes

- **Passwords:** bcrypt (`bcrypt==4.0.1`), constant-time verification; malformed hashes
  fail closed.
- **Sessions:** HS256 JWT (`sub`, `role`, `exp`), HttpOnly + `SameSite=Lax` cookie.
  `secure=False` is deliberate for localhost HTTP — set `secure=True` behind HTTPS.
- **Login shield:** 5 failed attempts per client IP **or** per Employee ID within 15
  minutes → HTTP 429 with `RATE_LIMITED_BLOCKED` written to the audit table. Every
  attempt — success, failure, blocked, deactivated — is logged with IP, user agent and
  IST timestamp.
  *Operational caveat:* because the rule is `IP OR username`, five typos from one machine
  behind an office NAT briefly lock that public IP for everyone. If that is undesirable,
  run each desk behind its own egress or change `_recent_failures()` in
  `app/routers/auth.py` to require both (`and_`).
- **Client IP:** taken from `X-Forwarded-For` (first hop) or the socket address. Deploy
  behind a proxy that *overwrites* that header (nginx `proxy_set_header`), otherwise a
  client can spoof its own IP.
- **RBAC:** enforced centrally with `Depends(get_current_user)` / `require_admin`; the
  Meta webhook is the only intentionally unauthenticated API (it is protected by the
  verify token and Meta's signature).
- **Secrets:** `.env` is git-ignored; the Meta access token is stored in
  `system_settings` and only ever returned masked (`EAAB…gh`).
- **Uploads:** capped at 10 MB and parsed in memory; only `.vcf/.csv/.xlsx/.xlsm/.json`.

---

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `database_engine` shows the local engine | PostgreSQL unreachable → check service, port 5432, role/password in `DATABASE_URL`; the app still works on SQLite |
| `429 Security Shield Active…` on login | 5 failures in 15 min for that IP/employee. Wait 15 min, use another account from another IP, or clear the probe rows: `DELETE FROM login_audit_logs WHERE status='INVALID_CREDENTIALS' AND timestamp_ist > now() - interval '15 minutes';` |
| `verify_demo_ready.py` exits `2` | Server not running / wrong port — start `uvicorn app.main:app --port 8000` or set `SUBSIDYX_BASE_URL` |
| Empty dashboard after a cutover | Expected: `LIVE` mode hides all mock rows. Admin → *Restore Demo Data* |
| Import says `0 created`, N duplicates | Phone numbers already exist; numbers are normalised to `+91XXXXXXXXXX` before dedupe |
| Meta webhook verification fails | Verify token mismatch, or Mode `LIVE` with a different token stored in `system_settings` than the one entered in Meta |
| Login page loads but APIs 401 | Cookie blocked/expired — sign in again; `ACCESS_TOKEN_EXPIRE_MINUTES` is 12 h |

---

## 12. Known limitations / next steps

1. **Live outbound send:** `LIVE` mode stops mock simulation and records real inbound
   webhook traffic, but the outbound Graph API `POST /{phone_number_id}/messages` call is
   not implemented yet — add it in `app/services/whatsapp_engine.py` with a retry queue
   and signature-verified webhooks before going to production.
2. **Schema migrations:** `create_all` only; add Alembic before evolving models.
3. **X-Hub-Signature-256** verification for inbound webhooks is not yet enforced.
4. **Rate-limit caveat** above (office NAT), and no per-endpoint throttling beyond login.
5. **Media messages** (images/documents) are not parsed from webhooks yet — text,
   buttons and interactive replies are.

---

## 13. Pre-demo runbook (7:00 PM)

```powershell
# 1. is the DB/service healthy?
Invoke-RestMethod http://127.0.0.1:8000/api/health

# 2. clean slate + full showcase, then prove it end-to-end
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/whatsapp/reset-demo-mock  # (admin cookie required)
.\venv\Scripts\python.exe verify_demo_ready.py    # expect "40 PASSED / 0 FAILED"

# 3. open the UI, sign in as nisarg, leave the Executive Overview on screen
start http://127.0.0.1:8000/login
```

During the showcase: *Contact Hub* → download a sample file and re-upload it;
*Templates* → launch a broadcast and advance delivery; *Inbox* → “Simulate incoming
client message”; *Security Vault* → show the IP audit log, then the Meta cutover modal.
Finish with **Restore Demo Data** so the next rehearsal starts clean.
