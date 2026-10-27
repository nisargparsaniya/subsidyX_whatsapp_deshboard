# AGENTS.md — SubsidyX In-House WhatsApp Command Center

Internal, staff-only WhatsApp marketing/chatbot console. HNI clients never log in.
`README.md` is the source of truth for features, API map, env vars and Meta setup.
`opencode_phases/*.md` are historical build specs and may drift from the code.

## Run and verify

From the repo root (`.env`, the SQLite fallback and `venv` are CWD-relative):

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# UI: http://127.0.0.1:8000/login  (demo admin: nisarg / Nisarg@2026)
Invoke-RestMethod http://127.0.0.1:8000/api/health
.\venv\Scripts\python.exe verify_demo_ready.py   # server must already be running
```

- First setup: `python -m venv venv`, `.\venv\Scripts\python.exe -m pip install -r requirements.txt`, copy `.env.example` to `.env` (never commit `.env`).
- `verify_demo_ready.py` is the only test suite: end-to-end HTTP checks, no pytest/ruff/mypy/CI. Exit `0` = pass, `1` = failures, `2` = server unreachable. Override the target with `SUBSIDYX_BASE_URL`.
- Run it only against the local demo DB. It creates/deletes rows, asserts MOCK mode, flips MOCK→LIVE (purging every `is_mock` row), overwrites stored Meta credentials with test values, then re-seeds. Never point it at production or real customer data.
- No per-test selector. To exercise one endpoint, keep the server running and use `curl`/`httpx` or `/docs`.

## Runtime gotchas

- `DATABASE_URL` is probed once at import (2 s timeout); if PostgreSQL is down, the app silently falls back to `subsidyx_inhouse.db` and stays there until restart. Check `database_engine` in `/api/health` before debugging "missing" data.
- No Alembic: startup runs `create_all()` + seeding, which never alters existing tables. After model changes, stop the server and delete the local SQLite DB (or add a migration) before testing.
- In MOCK mode, startup re-seeds the showcase whenever the contact book is empty. Deleting all contacts and restarting brings them back.
- `seed_users()` only inserts missing usernames. Editing `SEED_USERS` does not reset an existing account's password, and there is no password-reset UI; update `users.password_hash` directly (or delete a seeded user and restart to re-seed it).
- The active WhatsApp mode is stored in `system_settings`, not `.env`. Once a cutover/reset writes it, changing `WHATSAPP_MODE` has no effect; use admin `POST /api/whatsapp/reset-demo-mock` to return to MOCK.
- The login shield locks after 5 failures per IP **or** username in 15 minutes. Repeated auth tests can lock your own IP; wait or clear the relevant `login_audit_logs` rows.
- `is_mock=True` is the cutover contract: every showcase row must carry it, and `purge_mock_data()` deletes in FK-safe order.

## Layout and conventions

- Entrypoint: `app/main.py` → `app.main:app`; the lifespan calls `init_db()`.
- Routers in `app/routers/`: `auth`, `admin_users`, `contacts`, `campaigns_templates` (owns both `/api/templates` and `/api/campaigns`), `chatbot`, `whatsapp`. Auth/RBAC is applied per router or per endpoint, not in middleware.
- Services: `security` (bcrypt/JWT/client IP/RBAC), `contact_io` (vcf/csv/xlsx/json import-export, phone normalization), `whatsapp_engine` (template rendering, mock delivery, chatbot matching), `mock_seeder` (showcase + purge).
- Frontend: Jinja shell (`templates/dashboard.html`, `login.html`) plus one vanilla-JS file (`static/js/app.js`: hash router, string-rendered views, Chart.js) and `static/css/custom.css`. No bundler/build step; edit and hard-refresh. Chart.js and Google Fonts load from CDNs, so offline demos lose charts/fonts.
- Roles are server-side: `ADMIN` can issue/revoke employees, read audit logs and cut over Meta; `POST /api/admin/employees` always creates `EMPLOYEE`.
- Auth is an HttpOnly JWT cookie named `subsidyx_token`; a `Bearer` header also works for scripts.
- Git is local-only: branch `master`, no remote and no CI configured.

## Product rules (do not break)

- **Strict Zero-Emoji Policy**: No emojis in HTML, CSS, JavaScript, database templates, or mock seeders. Use clean inline SVGs and crisp typography.
- **Zero Hardcoding**: All Meta API versions, phone IDs, WABA IDs, access tokens, verify tokens, and initial seed credentials must be read from `.env` or `system_settings`. Never hardcode secrets in source or render passwords on `login.html`.
- **Secret-Admin Architecture**: Super Admin credentials are provided via environment variables (`ADMIN_INITIAL_USERS` / `.env`). Login screens and client assets must never display or leak employee passwords.
- **Deterministic Rules-First + AI Draft-for-Staff-Approval Adapter**: No AI-first bloat. Chatbot matches deterministic rules first (Keywords, First Touch, Menu, Button). AI replies (via OpenCode free models or OpenAI-compatible endpoints) are strictly optional draft suggestions requiring staff review and approval before sending to HNI clients; unapproved free-form AI text is never auto-sent.
- **Non-Destructive & Safe Meta Cutover**: MOCK seeds the Gujarat showcase (`is_mock=True`). Meta cutover stores credentials in `system_settings`, purges or isolates `is_mock` rows in FK-safe order, and cleanly operates in LIVE mode without endangering real customer communications.
- Do not commit `.env` or real Meta tokens; sensitive tokens are stored in `system_settings` and returned masked.

## Skills

Load `subsidyx-whatsapp-engine` for backend/WhatsApp changes; `ponytail` (+ `-review`/`-audit`) before refactors; `ui-ux-pro-max`, `frontend-design`, `impeccable` for UI; `graphify` for charts/analytics. Installed globally under `C:\Users\Nisarg Parsaniya\.agents\skills\`.

