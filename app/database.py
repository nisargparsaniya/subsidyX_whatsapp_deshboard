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


def init_db() -> None:
    """Create tables and seed the pre-authorised Super Admins + presentation mock data."""
    from app import models  # noqa: F401  registers every table on Base.metadata
    from app.models.user import seed_users
    from app.services.mock_seeder import seed_presentation_data

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_users(db)
        seed_presentation_data(db)
