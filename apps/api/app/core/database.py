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


def reconcile_database_schema(target_engine=None):
    """
    Ensures all tables and newly added operational columns exist.
    Idempotent and safe across development, testing, and production.
    """
    from sqlalchemy import text
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)

    if "postgresql" in str(eng.url):
        with eng.begin() as conn:
            cols = [
                ("status", "VARCHAR DEFAULT 'NEW'"),
                ("priority", "VARCHAR DEFAULT 'NORMAL'"),
                ("category", "VARCHAR DEFAULT 'GENERAL'"),
                ("observed_at", "TIMESTAMP WITH TIME ZONE"),
                ("assigned_to", "VARCHAR"),
                ("assigned_by", "VARCHAR"),
                ("assigned_at", "TIMESTAMP WITH TIME ZONE"),
                ("assignment_note", "TEXT"),
                ("cluster_id", "VARCHAR"),
                ("cluster_role", "VARCHAR DEFAULT 'INDEPENDENT'"),
                ("publication_state", "VARCHAR DEFAULT 'PRIVATE'"),
                ("triage_status", "VARCHAR DEFAULT 'PENDING'"),
                ("triage_flags", "JSONB DEFAULT '[]'::jsonb"),
                ("triage_notes", "TEXT"),
                ("resolution_type", "VARCHAR"),
                ("resolution_summary", "TEXT"),
                ("resolved_by", "VARCHAR"),
                ("resolved_at", "TIMESTAMP WITH TIME ZONE"),
                ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ]
            for col, col_type in cols:
                conn.execute(text(f"ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS {col} {col_type};"))

    # Seed default staff users if empty
    from apps.api.app.models.entities import StaffUser
    db = SessionLocal()
    try:
        if db.query(StaffUser).count() == 0:
            default_users = [
                StaffUser(id="staff_admin_01", username="admin_user", display_name="System Administrator (ผู้ดูแลระบบ)", role="ADMIN", email="admin@floodtrace.internal", department="Executive & Platform Operations"),
                StaffUser(id="staff_reviewer_01", username="reviewer_01", display_name="Somchai Reviewer (นักวิชาการสิ่งแวดล้อม)", role="REVIEWER", email="reviewer1@floodtrace.internal", department="Environmental Verification Unit"),
                StaffUser(id="staff_operator_01", username="operator_01", display_name="Wipha Triage (เจ้าหน้าที่คัดกรองเหตุ)", role="OPERATOR", email="operator1@floodtrace.internal", department="Triage & Field Dispatch"),
                StaffUser(id="staff_readonly_01", username="readonly_01", display_name="Auditor Public Observer (ผู้สังเกตการณ์อิสระ)", role="READ_ONLY", email="observer1@floodtrace.internal", department="External Audit & Governance"),
            ]
            db.add_all(default_users)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

