# PHASE 2: Mobile Contact Import/Export (.vcf, .csv, .xlsx), Templates, Bulk Marketing, Custom Chatbot Builder & Meta API Cutover

## Active Skills
Use `subsidyx-whatsapp-engine` and `ponytail`.

## Files to Create
1. `app/models/contact.py`
2. `app/models/template_campaign.py`
3. `app/models/chatbot_rule.py`
4. `app/models/whatsapp_message.py`
5. `app/models/system_setting.py`
6. `app/services/contact_io.py`
7. `app/services/whatsapp_engine.py`
8. `app/services/mock_seeder.py`
9. `app/routers/contacts.py`
10. `app/routers/campaigns_templates.py`
11. `app/routers/chatbot.py`
12. `app/routers/whatsapp.py`

## Specifications
1. **HNI Client Contact Model (`app/models/contact.py`)**:
   - `id`, `inquiry_id` (e.g., `#123`, `#938`), `client_name`, `company_name`, `whatsapp_number` (normalized to E.164 e.g. `+919825011223`), `email`, `state` (`Gujarat`), `district`, `taluka` (`Tarapur`, `Sanand`, etc.), `sector` (`Textile Industry`, `Information Technology`, `Pharmaceuticals`, `Green Energy`), `category`, `enterprise_classification` (`MSME - Small`, `MSME - Medium`, `Large Enterprise`, `Startup`), `term_loan_planned` (`Yes`/`No`), `project_type` (`New`/`Expansion`), `estimated_subsidy_lakhs` (Float), `tags` (e.g. `"VIP HNI, Welcome Sent"`), `opt_in_status` (Boolean), `assigned_ca`, `is_mock` (Boolean), `created_at`.
2. **Multi-Format Contact Import & Export (`app/services/contact_io.py` & `app/routers/contacts.py`)**:
   - `POST /api/contacts/import`: Accepts file uploads in:
     - **Mobile vCard (`.vcf`)**: Parse `BEGIN:VCARD` ... `FN:`, `ORG:`, `TEL:` blocks exported directly from iPhone/Android contacts!
     - **CSV (`.csv`)** and **Excel (`.xlsx`)**: Parse columns (`client_name`, `company_name`, `whatsapp_number`, `sector`, `district`, `estimated_subsidy_lakhs`, etc.) with smart column matching and automatic duplicate phone number deduplication.
     - **JSON (`.json`)**.
   - `GET /api/contacts/export?format=csv|xlsx|vcf`: Instant 1-click download of the entire HNI contact book in `.csv`, Excel `.xlsx`, or mobile `.vcf` format, plus `GET /api/contacts/sample-template` to download a sample CSV/VCF file during the 7:00 PM demo.
3. **WhatsApp Templates & Automated Welcome Message (`app/models/template_campaign.py` & `app/routers/campaigns_templates.py`)**:
   - `whatsapp_templates` table: `id`, `template_name`, `category` (`WELCOME`, `MARKETING`, `SUBSIDY_ALERT`, `CA_DOCUMENT_REQUEST`), `language` (`en_IN`, `gu_IN`, `hi_IN`), `header_text`, `body_text` (supports dynamic variables `{{client_name}}`, `{{company_name}}`, `{{sector}}`, `{{subsidy_amount}}`, `{{inquiry_id}}`), `footer_text`, `buttons_json`, `is_welcome_default` (Boolean), `is_mock` (Boolean).
   - **Auto-Welcome Trigger**: Option to automatically dispatch the active `WELCOME` template whenever a new HNI contact is added or imported via mobile file upload.
   - **Bulk Marketing Campaigns (`bulk_campaigns` table)**:
     - `POST /api/campaigns/launch`: Select target segment (`ALL`, `Textile Industry`, `Information Technology`, `MSME`, `Large Enterprise`, or custom tag), choose a template, dynamically interpolate variables for every matching HNI contact, create outbound `whatsapp_messages`, and track `total_targeted`, `sent_count`, `delivered_count`, `read_count`, `replied_count`.
4. **Custom Chatbot Builder (`app/models/chatbot_rule.py` & `app/routers/chatbot.py`)**:
   - `chatbot_flows` table: `id`, `bot_name`, `trigger_type` (`KEYWORD_MATCH`, `FIRST_INBOUND_WELCOME`, `BUTTON_PAYLOAD`, `ANY_UNMATCHED`), `trigger_keywords` (comma-separated e.g. `"hi, hello, subsidy, textile, loan, status"`), `response_type` (`TEXT`, `TEMPLATE`, `INTERACTIVE_MENU`), `response_content`, `auto_assign_sector`, `auto_assign_ca`, `is_active` (Boolean), `hit_count` (Integer), `is_mock` (Boolean).
   - Include a live test endpoint `POST /api/chatbot/simulate-inbound` so during the 7:00 PM demo, Nisarg can type an incoming client message (e.g., `"Hi, I need Gujarat Textile Subsidy details for our ₹15Cr expansion"`) and watch the Custom Chatbot automatically reply, tag the HNI client, and log the conversation in real time!
5. **Meta Official API One-Click Cutover (`POST /api/whatsapp/connect-meta-api`)**:
   - When an Admin submits `meta_phone_number_id`, `meta_waba_id`, and `meta_access_token`:
     - Immediately execute `DELETE` on `whatsapp_messages`, `bulk_campaigns`, `chatbot_flows`, `whatsapp_templates`, and `hni_contacts` where `is_mock == True`.
     - Save the credentials in `system_settings` and set `whatsapp_mode = "LIVE"`.
     - Also provide `POST /api/whatsapp/reset-demo-mock` so during rehearsals you can switch back and re-seed presentation data in 1 click.
