# PHASE 4: End-to-End Verification Script, README & Git Repository Finalization

## Active Skills
Use `ponytail-review` and `ponytail-audit`.

## Files to Create
1. `verify_demo_ready.py`
2. `README.md`

## Specifications
1. **`verify_demo_ready.py`**:
   - Automatically tests:
     1. Super Admin logins for `nisarg` (Nisarg Parsaniya), `gajendra` (Gajendra Jain), and `abhishek` (CA Abhishek Jain).
     2. Employee creation & deletion by Admin.
     3. IP & Timestamp recording in `login_audit_logs`.
     4. Login Rate Limiter (5 failed logins -> 6th blocked with HTTP 429).
     5. Mobile `.vcf` and `.csv` Contact Import & Export.
     6. Template creation, Bulk Campaign execution, and Custom Chatbot auto-reply simulation.
     7. Meta API Mock-to-Live Cutover (`is_mock=True` purge) followed by re-seeding presentation mock data so the database is 100% ready for the 7:00 PM showcase.
2. **`README.md`**:
   - Executive architecture documentation, Admin credentials table, PostgreSQL setup guide, and Meta WhatsApp Cloud API webhook configuration guide.
