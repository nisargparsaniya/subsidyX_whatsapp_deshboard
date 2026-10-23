# PHASE 3: Executive UI/UX, Shimmer Skeleton Loaders, Visual Analytics & 6-Module Command Center

## Active Skills
Use `ui-ux-pro-max`, `frontend-design`, `impeccable`, and `graphify`.

## Files to Create
1. `app/static/css/custom.css`
2. `app/static/js/app.js`
3. `app/templates/login.html`
4. `app/templates/dashboard.html`
5. `app/main.py`

## Specifications
1. **Brand Palette & Fonts (Matched to SubsidyX Identity)**:
   - Deep Navy `#191A47` sidebar/header, Brand Orange `#F26722` primary accents & active indicators, Slate `#F8FAFC` background, `#FFFFFF` cards with subtle `#E2E8F0` borders.
   - Fonts: `Plus Jakarta Sans` (headers), `Inter` (body/chat), `JetBrains Mono` (Inquiry IDs `#123`/`#938`, ₹ Lakhs/Crores, IP addresses, timestamps).
   - **Mandatory Shimmer Skeleton Loading**: Every view switch, KPI card, table load, and chat thread must show a smooth `.skeleton-shimmer` placeholder for 350ms before fading in real content.
2. **6 Clean, Self-Explanatory Modules in Sidebar (Designed for CAs, Tech & Non-Tech Personas)**:
   - **1. 📊 Executive Overview (Home)**:
     - 4 KPI Cards (Total HNI Contacts & Pipeline ₹ Cr, Bulk Campaign Delivery Rate %, Chatbot Auto-Resolved Inquiries, Active Security & Staff Sessions).
     - 2 Interactive `graphify` Chart.js visuals: *Subsidy Pipeline by Sector (Textile, IT, Pharma, Green Energy)* and *WhatsApp Marketing & Chatbot Engagement Funnel*.
     - Quick Action Bar: *"Import Mobile Contacts (.vcf/.csv)"*, *"Launch Bulk Broadcast"*, *"Simulate Client WhatsApp Message"*, *"Connect Official Meta API"*.
   - **2. 💬 Live WhatsApp Inbox & Chatbot Simulator (3-Pane View)**:
     - Left: HNI Client threads with Inquiry ID (`#123`, `#938`), Sector badge, and unread counter.
     - Center: WhatsApp chat bubble stream with 1-click Template Picker, manual composer, AND a **"⚡ Simulate Incoming Client Message"** button at the top so you can demonstrate the Custom Chatbot auto-replying live during your 7:00 PM demo!
     - Right: SubsidyX **"General Information" Client Dossier** (`Inquiry ID`, `Company Name`, `Category`, `Sector`, `District/Taluka`, `Term Loan: Yes/No`, `Enterprise Classification: MSME/Large`, `Project Type: New/Expansion`, `Estimated Subsidy ₹`) + 1-click Printable Client Summary.
   - **3. 📇 Contact Hub & Mobile Import/Export**:
     - Drag-and-drop uploader supporting **Mobile Contacts (`.vcf`)**, **Excel (`.xlsx`)**, and **CSV (`.csv`)** + **"Auto-Send Welcome Template on Import"** toggle.
     - 1-Click Export buttons: **Export CSV**, **Export Excel**, **Export Mobile vCard (`.vcf`)**, and **Download Sample Import File**.
     - Searchable, filterable HNI Contact table with Add/Edit Contact modal.
   - **4. 📣 Templates & Bulk Marketing Studio**:
     - **Template Builder Grid**: Pre-loaded with *Welcome Onboarding Message*, *Gujarat Industrial Policy Subsidy Alert*, *CA Term Loan Document Checklist*, and *Festival/Policy Update Broadcast*, plus ability to create new templates with `{{client_name}}`, `{{company_name}}`, `{{subsidy_amount}}` variables.
     - **Bulk Campaign Launcher**: Pick target audience filter, select template, preview live personalized WhatsApp bubble on a phone mockup, and click **"Launch Bulk Campaign"** with real-time progress bar & delivery metrics.
   - **5. 🤖 Custom Chatbot Builder**:
     - Visual Rule Cards showing Trigger Keywords (`"hi, subsidy, textile, eligibility"`), Action (`Send Welcome Menu / Template / Auto-Tag CA`), Hit Counter, Active Toggle switch, and **"Create New Chatbot Flow"** modal.
   - **6. 🛡️ Admin & Security Vault (Visible ONLY to Nisarg Parsaniya, Gajendra Jain & CA Abhishek Jain)**:
     - **Employee Credentials Manager**: Generate new Employee IDs & Passwords, toggle access, or delete employees.
     - **Live Login Audit & IP Log Table**: Shows `Timestamp (IST)`, `User / ID`, `Detected Role`, `Client IP Address`, `Browser/OS`, and `Security Status` (`SUCCESS`, `INVALID_CREDENTIALS`, `RATE_LIMITED_BLOCKED`).
     - **Meta Official API Cutover Panel**: Form to enter `Phone Number ID`, `WABA ID`, and `Access Token`. Clearly states: *"Submitting official Meta API keys will automatically purge all presentation mock data and switch the dashboard to 100% live production data."* Includes a 1-click **"Test Mock Purge / Restore Demo Data"** toggle for the presentation.
