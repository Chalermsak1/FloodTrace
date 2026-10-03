"""
Master System Refinement Audit & Verification Test Suite.
Validates dynamic counts, timestamp integrity, data provenance categorization,
privacy safeguards, fail-closed behavior, and administrative scope.
"""

import pytest
import asyncio
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.core.scheduler import source_scheduler
from apps.api.app.models.entities import WaterStation, RainfallStation, CitizenReport, IndustrialFacility
from apps.api.app.core.database import SessionLocal

client = TestClient(app)
ADMIN_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY, "X-Staff-Role": "ADMIN", "X-Staff-User": "admin_user"}


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.query(WaterStation).delete()
        db.query(RainfallStation).delete()
        db.commit()
        db.close()


def test_section_34_and_96_dynamic_station_counts_consistency(db_session: Session):
    """
    Section 34 & 96: Automated dynamic validation between Database, Public API, and Sources Health.
    Ensures rainfall station count is dynamically resolved (77 stations, NEVER hardcoded to 78).
    """
    if db_session.query(WaterStation).count() == 0:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session))
    if db_session.query(RainfallStation).count() == 0:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rainfall", db=db_session))

    # 1. Database actual counts
    db_water_count = db_session.query(WaterStation).count()
    db_rainfall_count = db_session.query(RainfallStation).count()

    assert db_water_count == 26, f"Expected 26 WaterStations in DB, got {db_water_count}"
    assert db_rainfall_count == 77, f"Expected 77 RainfallStations in DB, got {db_rainfall_count}"

    # 2. Public Overview endpoint
    resp = client.get("/api/public/overview")
    assert resp.status_code == 200
    overview = resp.json()

    assert overview["total_water_stations"] == db_water_count
    assert overview["total_rainfall_stations"] == db_rainfall_count
    assert overview["total_rainfall_stations"] != 78, "Station count must not be hardcoded to 78"

    # 3. Public Stations endpoint (returns list directly)
    stations_resp = client.get("/api/public/stations")
    assert stations_resp.status_code == 200
    stations_data = stations_resp.json()
    assert len(stations_data) == db_water_count

    # 4. Sources Health endpoint
    health_resp = client.get("/health/sources")
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert health_data["sources"]["thaiwater_rid_runoff"]["database_records"] == db_water_count
    assert health_data["sources"]["thaiwater_rainfall"]["database_records"] == db_rainfall_count


def test_section_30_and_97_timestamp_integrity_and_timezone(db_session: Session):
    """
    Section 30 & 97: Verified timezone integrity.
    Source timestamps must not be in the future, normalized properly to UTC for storage.
    """
    now_utc = datetime.now(timezone.utc)

    # Check water stations
    water_stations = db_session.query(WaterStation).all()
    for ws in water_stations:
        if ws.last_updated:
            ts = ws.last_updated
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            assert ts <= now_utc, f"WaterStation {ws.station_code} has future last_updated: {ts} > {now_utc}"

    # Check rainfall stations
    rainfall_stations = db_session.query(RainfallStation).all()
    for rs in rainfall_stations:
        if rs.last_updated:
            ts = rs.last_updated
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            assert ts <= now_utc, f"RainfallStation {rs.station_code} has future last_updated: {ts} > {now_utc}"


def test_section_31_32_33_provenance_grouping_and_terminology():
    """
    Section 31, 32, 33: Data Sources organized into Active, Reference, Blocked.
    Terminology uses AUTOMATED_REFRESH (never unproven REAL-TIME).
    DIW historical snapshot is clearly labeled May 2563 with no false contamination claims.
    """
    resp = client.get("/api/public/provenance")
    assert resp.status_code == 200
    data = resp.json()

    # Verify grouping
    assert "active_sources" in data
    assert "reference_sources" in data
    assert "blocked_sources" in data

    # Verify active sources
    active_keys = [s["source_id"] for s in data["active_sources"]]
    assert "thaiwater_rid_runoff" in active_keys
    assert "thaiwater_rainfall" in active_keys

    for src in data["active_sources"]:
        assert src["update_mode"] == "AUTOMATED_REFRESH"
        assert "15 นาที" in src["refresh_interval"]
        assert src["status"] == "ACTIVE"

    # Verify reference sources
    ref_keys = [s["source_id"] for s in data["reference_sources"]]
    assert "diw_industrial_waste" in ref_keys
    assert "dwr_waterways" in ref_keys

    diw_src = next(s for s in data["reference_sources"] if s["source_id"] == "diw_industrial_waste")
    assert "2563" in diw_src["dataset"]
    assert "ไม่ใช่ระดับความเป็นพิษ" in diw_src["disclaimer"]

    # Verify blocked sources fail-closed
    blocked_keys = [s["source_id"] for s in data["blocked_sources"]]
    assert "gistda_satellite" in blocked_keys
    assert "tmd_radar" in blocked_keys

    for src in data["blocked_sources"]:
        assert src["status"] == "BLOCKED"
        assert src["update_mode"] == "BLOCKED"


def test_section_39_and_52_public_privacy_and_no_pii_leakage():
    """
    Section 39 & 52: Strict schema separation.
    Public APIs must NEVER leak reporter phone, reporter email, or exact private GPS coordinates.
    """
    resp = client.get("/api/public/observations")
    assert resp.status_code == 200
    obs_list = resp.json()

    assert isinstance(obs_list, list)
    for obs in obs_list:
        assert "reporter_phone" not in obs
        assert "reporter_email" not in obs
        assert "reporter_name" not in obs
        assert "exact_latitude" not in obs
        assert "exact_longitude" not in obs
        assert "internal_notes" not in obs
        assert "reviewer_notes" not in obs


def test_section_53_and_54_system_health_and_scheduler_status():
    """
    Section 53 & 54: System Health & Automated Refresh Monitoring returns authentic runtime state.
    """
    # Sources health
    health_resp = client.get("/health/sources")
    assert health_resp.status_code == 200
    h_data = health_resp.json()
    assert h_data["status"] == "monitored"
    assert "thaiwater_rid_runoff" in h_data["sources"]
    assert "thaiwater_rainfall" in h_data["sources"]

    tw_wl = h_data["sources"]["thaiwater_rid_runoff"]
    assert tw_wl["AUTOMATED_REFRESH"] is True
    assert tw_wl["circuit_breaker"]["state"] == "CLOSED"

    # Scheduler status (Internal admin requires auth)
    sched_resp = client.get("/api/v1/admin/scheduler/status", headers=ADMIN_HEADERS)
    assert sched_resp.status_code == 200
    s_data = sched_resp.json()
    assert "scheduler_active" in s_data
    assert "sources" in s_data
