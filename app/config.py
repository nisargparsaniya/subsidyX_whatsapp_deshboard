"""Application settings, loaded from .env (see .env.example)."""

import json
from typing import Any
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    PROJECT_NAME: str = "SubsidyX In-House WhatsApp & Campaign Command Center"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/subsidyx_whatsapp"
    SECRET_KEY: str = "subsidyx-inhouse-hni-vault-secret-2026-nisarg-gajendra-abhishek"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    # Meta Cloud API settings
    WHATSAPP_MODE: str = "MOCK"
    META_GRAPH_API_VERSION: str = "v21.0"
    META_PHONE_NUMBER_ID: str = ""
    META_WABA_ID: str = ""
    META_ACCESS_TOKEN: str = ""
    META_VERIFY_TOKEN: str = "subsidyx_meta_verify_2026"

    # Initial staff credential seeding (loaded from .env, zero hardcoding in models/templates)
    BOOTSTRAP_ADMIN_PHONES: str = (
        "9426015394:Nisarg Parsaniya:nisarg:System Architect & Super Admin,"
        "7742421983:Gajendra Jain:gajendra:Managing Director & Super Admin,"
        "9825359575:CA Abhishek Jain:abhishek:Principal Chartered Accountant & Super Admin"
    )
    ADMIN_INITIAL_USERS: str = (
        '[{"username":"nisarg","full_name":"Nisarg Parsaniya","designation":"System Architect & Super Admin","role":"ADMIN","password":"Nisarg@2026"},'
        '{"username":"gajendra","full_name":"Gajendra Jain","designation":"Managing Director & Super Admin","role":"ADMIN","password":"Gajendra@2026"},'
        '{"username":"abhishek","full_name":"CA Abhishek Jain","designation":"Principal Chartered Accountant & Super Admin","role":"ADMIN","password":"Abhishek@2026"},'
        '{"username":"emp_rahul","full_name":"Rahul Desai","designation":"Subsidy Relationship Executive","role":"EMPLOYEE","password":"Rahul@2026"}]'
    )

    # Deterministic Rules-First + AI Draft-for-Staff-Approval Adapter
    AI_ENABLED: bool = False
    AI_PROVIDER: str = "opencode"  # 'opencode', 'openai_compatible', 'mock'
    AI_API_BASE: str = "https://api.opencode.ai/v1"
    AI_API_KEY: str = ""
    AI_MODEL: str = "free"
    AI_AUTO_SUGGEST_DRAFT: bool = True

    def get_initial_users(self) -> list[dict[str, Any]]:
        try:
            return json.loads(self.ADMIN_INITIAL_USERS)
        except Exception:
            return []

    def get_bootstrap_admin_phones(self) -> list[dict[str, str]]:
        """Parses phone:name:username:designation from BOOTSTRAP_ADMIN_PHONES."""
        admins: list[dict[str, str]] = []
        for chunk in self.BOOTSTRAP_ADMIN_PHONES.split(","):
            chunk = chunk.strip()
            if not chunk:
                continue
            parts = [p.strip() for p in chunk.split(":")]
            if len(parts) >= 4:
                raw_phone, full_name, username, designation = parts[0], parts[1], parts[2], parts[3]
                digits = "".join(filter(str.isdigit, raw_phone))
                normalized = f"+91{digits[-10:]}" if len(digits) >= 10 else f"+91{digits}"
                admins.append({
                    "phone_number": normalized,
                    "phone_10": digits[-10:],
                    "full_name": full_name,
                    "username": username.lower(),
                    "designation": designation,
                    "role": "ADMIN",
                })
        return admins


settings = Settings()
