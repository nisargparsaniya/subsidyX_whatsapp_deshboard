"""Application settings, loaded from .env (see .env.example)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    PROJECT_NAME: str = "SubsidyX In-House WhatsApp & Campaign Command Center"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/subsidyx_whatsapp"
    SECRET_KEY: str = "subsidyx-inhouse-hni-vault-secret-2026-nisarg-gajendra-abhishek"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    WHATSAPP_MODE: str = "MOCK"
    META_GRAPH_API_VERSION: str = "v21.0"
    META_PHONE_NUMBER_ID: str = ""
    META_WABA_ID: str = ""
    META_ACCESS_TOKEN: str = ""
    META_VERIFY_TOKEN: str = "subsidyx_meta_verify_2026"


settings = Settings()
