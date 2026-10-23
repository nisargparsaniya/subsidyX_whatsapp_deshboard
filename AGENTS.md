# AGENTS.md — SubsidyX In-House WhatsApp Marketing, Chatbot & HNI Command Center

## 1. Mandatory Global Agent Skills to Activate
Before generating code in any phase, load and obey the instructions from these installed global skills in `C:\Users\Nisarg Parsaniya\.agents\skills\`:
- **`ui-ux-pro-max` & `frontend-design` & `impeccable`**: Enforce executive financial aesthetics, crisp typography (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`), high-contrast readability for CAs and non-tech operators, and `.skeleton-shimmer` loading animations on every module.
- **`graphify`**: Build high-clarity, interactive Chart.js analytics on the Executive Home Dashboard (Campaign Delivery Funnel, Subsidy Sector Distribution, Inbound vs Outbound WhatsApp Volume).
- **`subsidyx-whatsapp-engine`**: Follow the strict RBAC, IP Audit Logging, Rate Limiting, Mobile Contact Import/Export (`.vcf`, `.csv`, `.xlsx`), Bulk Marketing, Custom Chatbot Builder, and One-Click Meta API Mock-Purge architecture.
- **`ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-review`**: Maintain clean, modular, zero-technical-debt Python 3.11+ / FastAPI / SQLAlchemy 2.0 / Pydantic v2 code.

## 2. Core Business Rules (READ CAREFULLY)
1. **Strictly In-House Internal Platform**: HNI Clients NEVER log into this dashboard. It is used strictly inside the organization by Admins, CAs, and Relationship Managers.
2. **Pre-Seeded Super Admins (Auto-Identified by Server on Login)**:
   - Username: `nisarg` | Name: `Nisarg Parsaniya` | Role: `ADMIN` | Pass: `Nisarg@2026`
   - Username: `gajendra` | Name: `Gajendra Jain` | Role: `ADMIN` | Pass: `Gajendra@2026`
   - Username: `abhishek` | Name: `CA Abhishek Jain` | Role: `ADMIN` | Pass: `Abhishek@2026`
   - Seeded Demo Employee: `emp_rahul` | Name: `Rahul Mehta (Executive)` | Role: `EMPLOYEE` | Pass: `Rahul@2026`
3. **Admin Powers**: Only `nisarg`, `gajendra`, and `abhishek` can generate new Employee IDs & Passwords, revoke/delete employees, inspect the `login_audit_logs` table (showing Who logged in, Role, Client IP, User-Agent, Timestamp IST, Status), and submit the official Meta WhatsApp API keys.
4. **Presentation Mock Mode vs. Meta Official API Live Cutover**:
   - By default, `WHATSAPP_MODE=MOCK` seeds realistic Gujarat HNI contacts (`#123` ABC Pvt Ltd, `#938` Newgen InfoTech, etc.), WhatsApp templates, bulk campaigns, chatbot rules, and chat threads with `is_mock=True`.
   - The moment an Admin submits Meta Official API credentials (`Phone Number ID`, `WABA ID`, `Access Token`) in the **Meta API Cutover Modal**, the backend MUST execute a database purge of all rows where `is_mock == True` and switch the system permanently to `LIVE` mode showing only real database records.
