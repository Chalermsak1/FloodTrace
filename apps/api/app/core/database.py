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
    Uses versioned migrations via MigrationManager for deterministic, repeatable schema management.
    Idempotent and safe across development, testing, and production.
    """
    from sqlalchemy import text
    from migrations.migration_manager import MigrationManager

    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)

    try:
        MigrationManager.apply_migrations(eng)
    except Exception as e:
        # Fallback for environments with strict execution limits or SQLite quirks
        import logging
        logging.getLogger(__name__).warning(f"Versioned migration note: {e}")

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

            # Reconcile external evidence & monitoring event columns
            conn.execute(text("ALTER TABLE external_evidence ADD COLUMN IF NOT EXISTS parent_evidence_id VARCHAR(100);"))
            conn.execute(text("ALTER TABLE external_evidence ADD COLUMN IF NOT EXISTS source_group_id VARCHAR(100);"))
            conn.execute(text("ALTER TABLE external_evidence ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE external_evidence ADD COLUMN IF NOT EXISTS duplicate_reason TEXT;"))
            conn.execute(text("ALTER TABLE external_evidence ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE external_evidence ADD COLUMN IF NOT EXISTS text_excerpt TEXT;"))

            conn.execute(text("ALTER TABLE external_evidence_media ADD COLUMN IF NOT EXISTS storage_policy VARCHAR(50) DEFAULT 'REFERENCE_ONLY';"))
            conn.execute(text("ALTER TABLE external_evidence_media ADD COLUMN IF NOT EXISTS sha256 VARCHAR(100);"))
            conn.execute(text("ALTER TABLE external_evidence_media ADD COLUMN IF NOT EXISTS license_or_permission_status VARCHAR(100) DEFAULT 'VIEW_AT_SOURCE_ONLY';"))

            conn.execute(text("ALTER TABLE monitoring_events ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE monitoring_events ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE monitoring_events ADD COLUMN IF NOT EXISTS source_summary TEXT;"))
            conn.execute(text("ALTER TABLE monitoring_events ADD COLUMN IF NOT EXISTS publication_status VARCHAR(50) DEFAULT 'PUBLIC_SAFE';"))

            conn.execute(text("ALTER TABLE evidence_event_links ADD COLUMN IF NOT EXISTS relation_type VARCHAR(100) DEFAULT 'PRIMARY_EVIDENCE';"))
            conn.execute(text("ALTER TABLE evidence_event_links ADD COLUMN IF NOT EXISTS independence_group VARCHAR(100);"))

            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_external_evidence_status ON external_evidence(verification_status, publication_status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_external_evidence_loc ON external_evidence(district, location_precision);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_monitoring_events_status ON monitoring_events(status, monitoring_priority);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_media_sha256 ON external_evidence_media(sha256);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_external_evidence_source_group ON external_evidence(source_group_id);"))

            # Reconcile external_information columns & indexes (Sections 8, 26)
            conn.execute(text("ALTER TABLE external_information ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE external_information ADD COLUMN IF NOT EXISTS source_status VARCHAR(50) DEFAULT 'AVAILABLE';"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_external_info_status ON external_information(verification_status, publication_status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_external_info_event ON external_information(monitoring_event_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_external_info_type ON external_information(source_type, authority_level);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_external_info_demo ON external_information(is_demo, source_status);"))

            # Reconcile observation timing model & performance indexes (Section 3 & 25)
            conn.execute(text("ALTER TABLE water_level_observations ADD COLUMN IF NOT EXISTS observed_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE water_level_observations ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE water_level_observations ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE water_level_observations ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_wl_station_time ON water_level_observations(station_id, source_timestamp DESC);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_wl_observed_at ON water_level_observations(observed_at DESC);"))

            conn.execute(text("ALTER TABLE rainfall_observations ADD COLUMN IF NOT EXISTS observed_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE rainfall_observations ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE rainfall_observations ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE rainfall_observations ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rf_station_time ON rainfall_observations(station_id, source_timestamp DESC);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rf_observed_at ON rainfall_observations(observed_at DESC);"))

            # Telemetry station indexes for quick spatial & freshness queries
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ws_last_updated ON water_stations(last_updated DESC);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rs_last_updated ON rainfall_stations(last_updated DESC);"))


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

