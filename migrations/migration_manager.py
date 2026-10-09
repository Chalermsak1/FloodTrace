"""
FloodTrace Versioned Migration Manager
Provides deterministic, repeatable, and reversible schema migration runner
without external framework dependencies (pure SQLAlchemy/PostgreSQL/SQLite compatible).
"""

import os
import glob
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = os.path.dirname(os.path.abspath(__file__))
VERSIONS_DIR = os.path.join(MIGRATIONS_DIR, "versions")


class MigrationManager:
    """Manages deterministic forward and rollback migrations."""

    @staticmethod
    def ensure_migration_table(conn) -> None:
        """Ensures the schema_migrations tracking table exists."""
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))

    @classmethod
    def get_applied_versions(cls, conn) -> List[str]:
        """Retrieves list of already applied migration version strings."""
        cls.ensure_migration_table(conn)
        result = conn.execute(text("SELECT version FROM schema_migrations ORDER BY version ASC;"))
        return [row[0] for row in result.fetchall()]

    @classmethod
    def discover_migrations(cls) -> List[Dict[str, str]]:
        """Finds all forward migration SQL files ordered by version."""
        if not os.path.exists(VERSIONS_DIR):
            return []
        files = sorted(glob.glob(os.path.join(VERSIONS_DIR, "*_*.sql")))
        migrations = []
        for f in files:
            basename = os.path.basename(f)
            if basename.endswith("_downgrade.sql"):
                continue
            parts = basename.split("_", 1)
            version = parts[0]
            name = parts[1].replace(".sql", "")
            migrations.append({
                "version": version,
                "name": name,
                "filepath": f,
                "downgrade_filepath": os.path.join(VERSIONS_DIR, f"{version}_{name}_downgrade.sql")
            })
        return migrations

    @classmethod
    def apply_migrations(cls, engine: Engine) -> List[str]:
        """
        Applies any pending migrations in sequential order inside a transaction.
        Returns list of newly applied migration versions.
        """
        applied_now = []
        is_postgres = "postgresql" in str(engine.url)

        with engine.begin() as conn:
            cls.ensure_migration_table(conn)
            applied_existing = set(cls.get_applied_versions(conn))
            all_migrations = cls.discover_migrations()

            for mig in all_migrations:
                v = mig["version"]
                if v not in applied_existing:
                    logger.info(f"Applying migration {v}: {mig['name']}...")
                    with open(mig["filepath"], "r", encoding="utf-8") as f:
                        sql_content = f.read()

                    # Execute SQL statements
                    # Split statements safely by semicolon if SQLite, or execute whole block in PostgreSQL
                    if is_postgres:
                        conn.execute(text(sql_content))
                    else:
                        for stmt in sql_content.split(";"):
                            stmt_clean = stmt.strip()
                            if stmt_clean and not stmt_clean.startswith("--"):
                                conn.execute(text(stmt_clean))

                    conn.execute(
                        text("INSERT INTO schema_migrations (version, name, applied_at) VALUES (:v, :n, :t);"),
                        {"v": v, "n": mig["name"], "t": datetime.now(timezone.utc)}
                    )
                    applied_now.append(v)
                    logger.info(f"Migration {v} successfully applied.")

        return applied_now

    @classmethod
    def rollback_migration(cls, engine: Engine, target_version: str) -> bool:
        """
        Rolls back a single applied migration using its corresponding downgrade SQL.
        """
        is_postgres = "postgresql" in str(engine.url)
        with engine.begin() as conn:
            cls.ensure_migration_table(conn)
            applied = cls.get_applied_versions(conn)
            if target_version not in applied:
                logger.warning(f"Version {target_version} has not been applied.")
                return False

            all_migrations = {m["version"]: m for m in cls.discover_migrations()}
            mig = all_migrations.get(target_version)
            if not mig or not os.path.exists(mig["downgrade_filepath"]):
                raise FileNotFoundError(f"Downgrade SQL for {target_version} not found.")

            with open(mig["downgrade_filepath"], "r", encoding="utf-8") as f:
                sql_content = f.read()

            if is_postgres:
                conn.execute(text(sql_content))
            else:
                for stmt in sql_content.split(";"):
                    stmt_clean = stmt.strip()
                    if stmt_clean and not stmt_clean.startswith("--"):
                        conn.execute(text(stmt_clean))

            conn.execute(text("DELETE FROM schema_migrations WHERE version = :v;"), {"v": target_version})
            logger.info(f"Migration {target_version} successfully rolled back.")
            return True

    @classmethod
    def get_migration_status(cls, engine: Engine) -> Dict[str, Any]:
        """Returns structured status of schema migrations."""
        with engine.connect() as conn:
            cls.ensure_migration_table(conn)
            applied = cls.get_applied_versions(conn)

        all_migs = cls.discover_migrations()
        pending = [m["version"] for m in all_migs if m["version"] not in applied]
        return {
            "applied_versions": applied,
            "pending_versions": pending,
            "latest_applied": applied[-1] if applied else None,
            "total_available": len(all_migs)
        }

    @classmethod
    def validate_schema(cls, engine: Engine) -> Dict[str, bool]:
        """Validates that all external evidence and monitoring tables and columns exist."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        required_tables = [
            "monitoring_events",
            "external_evidence",
            "external_evidence_media",
            "evidence_event_links",
            "external_evidence_audit_logs",
            "external_evidence_analyses"
        ]
        status = {}
        for t in required_tables:
            status[t] = t in tables

        # Validate columns in external_evidence
        if "external_evidence" in tables:
            cols = {c["name"] for c in inspector.get_columns("external_evidence")}
            status["ext_has_source_group"] = "source_group_id" in cols
            status["ext_has_parent_id"] = "parent_evidence_id" in cols
            status["ext_has_content_hash"] = "content_hash" in cols
            status["ext_has_observed_at"] = "observed_at" in cols
            status["ext_has_published_at"] = "published_at" in cols

        return status
