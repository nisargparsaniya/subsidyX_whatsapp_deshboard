"""PostgreSQL 17 primary engine with instant SQLite failover so the demo never crashes."""

import logging
from collections.abc import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

FALLBACK_DATABASE_URL = "sqlite:///./subsidyx_inhouse.db"
PG_OK = "PostgreSQL 17"
PG_FALLBACK = "PostgreSQL-Compatible Local Engine (Ready for PG Cutover)"


class Base(DeclarativeBase):
    pass


def _normalize_pg_url(url: str) -> str:
    """SQLAlchemy maps bare `postgresql://` to psycopg3; this project ships psycopg2-binary."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


def _engine_for(url: str):
    """Build an engine and prove it answers before we trust it."""
    is_sqlite = url.startswith("sqlite")
    url = _normalize_pg_url(url)
    engine = create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False} if is_sqlite else {"connect_timeout": 2},
    )
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        engine.dispose()
        raise
    return engine


try:
    engine = _engine_for(settings.DATABASE_URL)
    DB_ENGINE_TYPE = PG_FALLBACK if settings.DATABASE_URL.startswith("sqlite") else PG_OK
except Exception as exc:  # no local PostgreSQL service / password / database yet
    engine = _engine_for(FALLBACK_DATABASE_URL)
    DB_ENGINE_TYPE = PG_FALLBACK
    logging.getLogger("subsidyx.database").warning(
        "PostgreSQL unavailable (%s) - falling back to %s", exc.__class__.__name__, FALLBACK_DATABASE_URL
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_schema_columns(bind_engine) -> None:
    """Safely adds missing columns to existing tables when running without Alembic."""
    from sqlalchemy import text
    with bind_engine.begin() as conn:
        dialect = conn.dialect.name
        if dialect == "postgresql":
            statements = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(120)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT '/static/img/logo-mark.png'",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_source VARCHAR(40) DEFAULT 'DEFAULT_LOGO'",
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone_number ON users(phone_number)",
                "ALTER TABLE bulk_campaigns ADD COLUMN IF NOT EXISTS campaign_category VARCHAR(60)",
                "ALTER TABLE bulk_campaigns ADD COLUMN IF NOT EXISTS target_list_ids_json TEXT",
                "ALTER TABLE bulk_campaigns ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(20) DEFAULT 'IMMEDIATE'",
                "ALTER TABLE bulk_campaigns ADD COLUMN IF NOT EXISTS scheduled_at_ist TIMESTAMP WITH TIME ZONE",
                "ALTER TABLE bulk_campaigns ADD COLUMN IF NOT EXISTS executed_at_ist TIMESTAMP WITH TIME ZONE",
                "ALTER TABLE hni_contacts ADD COLUMN IF NOT EXISTS client_profile_type VARCHAR(40) DEFAULT 'INDUSTRIALIST'",
                "ALTER TABLE hni_contacts ADD COLUMN IF NOT EXISTS client_tier VARCHAR(20)",
                "ALTER TABLE hni_contacts ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT '/static/img/logo-mark.png'",
                "ALTER TABLE hni_contacts ADD COLUMN IF NOT EXISTS avatar_source VARCHAR(40) DEFAULT 'DEFAULT_LOGO'",
                "ALTER TABLE omni_leads ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT '/static/img/logo-mark.png'",
                "ALTER TABLE omni_leads ADD COLUMN IF NOT EXISTS avatar_source VARCHAR(40) DEFAULT 'DEFAULT_LOGO'",
            ]
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                except Exception:
                    pass
        elif dialect == "sqlite":
            for col, ctype in [
                ("phone_number", "VARCHAR(20)"),
                ("email", "VARCHAR(120)"),
                ("avatar_url", "VARCHAR(500) DEFAULT '/static/img/logo-mark.png'"),
                ("avatar_source", "VARCHAR(40) DEFAULT 'DEFAULT_LOGO'"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {ctype}"))
                except Exception:
                    pass
            for col, ctype in [
                ("campaign_category", "VARCHAR(60)"),
                ("target_list_ids_json", "TEXT"),
                ("schedule_type", "VARCHAR(20) DEFAULT 'IMMEDIATE'"),
                ("scheduled_at_ist", "DATETIME"),
                ("executed_at_ist", "DATETIME"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE bulk_campaigns ADD COLUMN {col} {ctype}"))
                except Exception:
                    pass
            for col, ctype in [
                ("client_profile_type", "VARCHAR(40) DEFAULT 'INDUSTRIALIST'"),
                ("client_tier", "VARCHAR(20)"),
                ("avatar_url", "VARCHAR(500) DEFAULT '/static/img/logo-mark.png'"),
                ("avatar_source", "VARCHAR(40) DEFAULT 'DEFAULT_LOGO'"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE hni_contacts ADD COLUMN {col} {ctype}"))
                except Exception:
                    pass
            for col, ctype in [
                ("avatar_url", "VARCHAR(500) DEFAULT '/static/img/logo-mark.png'"),
                ("avatar_source", "VARCHAR(40) DEFAULT 'DEFAULT_LOGO'"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE omni_leads ADD COLUMN {col} {ctype}"))
                except Exception:
                    pass


def init_db() -> None:
    """Create tables and seed the pre-authorised Super Admins + presentation mock data."""
    from app import models  # noqa: F401  registers every table on Base.metadata
    from app.models.user import seed_users
    from app.services.mock_seeder import seed_presentation_data
    from app.routers.leads_integrations import _ensure_default_channels

    Base.metadata.create_all(bind=engine)
    _ensure_schema_columns(engine)
    with SessionLocal() as db:
        seed_users(db)
        _ensure_default_channels(db)
        seed_presentation_data(db)

        # Backfill tiers for existing contacts
        from sqlalchemy import select
        from app.models.contact import HniContact
        from app.services.tier_engine import compute_client_tier
        contacts = db.scalars(select(HniContact)).all()
        for c in contacts:
            if not c.client_tier and (not c.client_profile_type or c.client_profile_type == "INDUSTRIALIST"):
                c.client_tier = compute_client_tier("INDUSTRIALIST", c.enterprise_classification, c.estimated_subsidy_lakhs)
        db.commit()
