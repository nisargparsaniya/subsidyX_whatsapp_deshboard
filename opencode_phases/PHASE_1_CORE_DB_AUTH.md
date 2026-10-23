# PHASE 1: PostgreSQL 17 + Smart Failover Engine, Auto-Role Auth, IP Audit Logs & Login Rate Limiter

## Active Skills
Use `subsidyx-whatsapp-engine` and `ponytail-audit`.

## Files to Create
1. `requirements.txt`
2. `app/__init__.py`
3. `app/config.py`
4. `app/database.py`
5. `app/models/__init__.py`
6. `app/models/user.py`
7. `app/models/audit_log.py`
8. `app/services/security.py`
9. `app/routers/auth.py`
10. `app/routers/admin_users.py`

## Specifications
1. **`app/database.py` (PostgreSQL Primary + Instant Safe Fallback)**:
   - Attempt connection to `DATABASE_URL` (`postgresql://postgres:postgres@localhost:5432/subsidyx_whatsapp`) with a 2-second connect timeout.
   - If PostgreSQL is active, use it directly and expose `DB_ENGINE_TYPE = "PostgreSQL 17"`.
   - If the local PostgreSQL service or password is not yet configured, automatically fallback to `sqlite:///./subsidyx_inhouse.db` (`check_same_thread=False`) and expose `DB_ENGINE_TYPE = "PostgreSQL-Compatible Local Engine (Ready for PG Cutover)"` so the 7:00 PM demo never crashes.
2. **`app/models/user.py` (`users` table)**:
   - `id`, `username` (unique), `full_name`, `designation`, `role` (`ADMIN` or `EMPLOYEE`), `password_hash`, `is_active`, `created_by`, `created_at`.
   - Seed the 3 Super Admins on startup:
     - `nisarg` -> `Nisarg Parsaniya` (`System Architect & Super Admin`, pass: `Nisarg@2026`)
     - `gajendra` -> `Gajendra Jain` (`Managing Director & Super Admin`, pass: `Gajendra@2026`)
     - `abhishek` -> `CA Abhishek Jain` (`Principal Chartered Accountant & Super Admin`, pass: `Abhishek@2026`)
     - `emp_rahul` -> `Rahul Desai` (`Subsidy Relationship Executive`, role: `EMPLOYEE`, pass: `Rahul@2026`)
3. **`app/models/audit_log.py` (`login_audit_logs` table)**:
   - `id`, `username_attempted`, `full_name`, `role_detected`, `ip_address` (auto-extracted from `X-Forwarded-For` or `request.client.host`), `user_agent`, `status` (`SUCCESS`, `INVALID_CREDENTIALS`, `RATE_LIMITED_BLOCKED`, `ACCOUNT_LOCKED`), `timestamp_ist`.
4. **Rate Limiter on `POST /api/auth/login` (`app/routers/auth.py`)**:
   - Count failed attempts in `login_audit_logs` from the same `ip_address` OR `username_attempted` within the last 15 minutes.
   - If `failed_count >= 5`, log `RATE_LIMITED_BLOCKED` and return HTTP `429` with message: `"Security Shield Active: 5 failed login attempts detected from your IP. Access locked for 15 minutes."`
   - On valid login, automatically detect whether the user is `ADMIN` or `EMPLOYEE`, log `SUCCESS` with IP & IST time, set an HttpOnly JWT cookie, and return user details.
5. **Employee ID & Password Management (`app/routers/admin_users.py`)**:
   - Admin-only endpoints (`GET /api/admin/employees`, `POST /api/admin/employees`, `DELETE /api/admin/employees/{id}`, `GET /api/admin/audit-logs`) allowing Nisarg, Gajendra Jain, and CA Abhishek Jain to generate or delete employee credentials and audit all login IPs.
