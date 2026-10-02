from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from apps.api.app.core.config import settings

"""
Master Prompt Section 9 & 10: DATABASE CONNECTION POOL & RELIABILITY
Configuration rationale:
- pool_size=10: Sized to handle concurrent API read requests across GIS layers and dashboard sections
  without saturating the local/production PostgreSQL max_connections limit.
- max_overflow=20: Accommodates temporary request surges (e.g., severe flood incidents, concurrent reporting).
- pool_timeout=30: Rejects hanging client requests after 30 seconds to prevent connection starvation cascades.
- pool_recycle=1800: Recycles connections every 30 minutes to clean up stale sockets or firewall-dropped idle TCP links.
- pool_pre_ping=True: Actively tests connectivity with 'SELECT 1' before issuing queries to discard dead sockets.
- statement_timeout=10000ms: Automatically cancels runaway queries after 10 seconds, preventing lock contention.
"""

connect_args = {}
if "postgresql" in settings.DATABASE_URL:
    connect_args["options"] = f"-c statement_timeout={settings.DB_STATEMENT_TIMEOUT_MS}"

# SQLite fallback compatibility for isolated unit test fixtures
if "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,
        connect_args=connect_args
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
