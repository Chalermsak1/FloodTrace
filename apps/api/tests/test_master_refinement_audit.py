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
ADMIN_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY}


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
    # 1. Database actual counts
    db_water_count = db_session.query(WaterStation).count()
    db_rainfall_count = db_session.query(RainfallStation).count()

    # 2. Public Overview endpoint
    resp = client.get("/api/public/overview")
    assert resp.status_code == 200
    overview = resp.json()

    assert overview["total_water_stations"] == db_water_count
    assert overview["total_rainfall_stations"] == db_rainfall_count

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
            assert ts <= now_utc, f"WaterStation {ws.id} has future last_updated: {ts} > {now_utc}"

    # Check rainfall stations
    rainfall_stations = db_session.query(RainfallStation).all()
    for rs in rainfall_stations:
        if rs.last_updated:
            ts = rs.last_updated
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            assert ts <= now_utc, f"RainfallStation {rs.id} has future last_updated: {ts} > {now_utc}"


def test_section_31_32_33_provenance_uses_canonical_source_status():
    """Public provenance reflects implemented paths and local artifact evidence."""
    response = client.get("/api/public/provenance")
    assert response.status_code == 200
    rows = {row["source_id"]: row for row in response.json()["sources"]}
    assert rows["thaiwater_rid_runoff"]["source_status"] == "ACTIVE API"
    assert rows["thaiwater_rainfall"]["source_status"] == "ACTIVE API"
    assert rows["diw_industrial_waste"]["source_status"] == "LOCAL / UNVERIFIED"
    for source_id in ("dwr_waterways", "dopa_villages", "moph_hospitals"):
        assert rows[source_id]["source_status"] == "UNAVAILABLE / UNVERIFIED"
    assert rows["tmd_forecast"]["source_status"] == "BLOCKED"

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


def test_section_14_and_15_citizen_report_id_format_and_public_tracking(db_session: Session):
    """
    Section 14 & 15: Citizen Report ID generation (FT-2026-XXXXXX) and Public Tracking.
    Verifies unique ID format, tracking endpoint returns clean status, zero PII, and 404 on missing report.
    """
    # 1. Create a citizen report
    payload = {
        "category": "น้ำเปลี่ยนสี",
        "district": "กบินทร์บุรี",
        "subdistrict": "เมืองเก่า",
        "latitude": 13.995,
        "longitude": 101.725,
        "description": "พบเห็นน้ำมีสีดำคล้ำผิดปกติตอนช่วงเช้า",
        "water_depth_cm": 15.0,
        "declaration_confirmed": True
    }
    post_resp = client.post("/api/public/reports", json=payload)
    assert post_resp.status_code in (200, 201), f"Expected 200/201, got {post_resp.status_code}: {post_resp.text}"
    post_data = post_resp.json()
    assert post_data["success"] is True
    report_id = post_data["report_id"]
    assert report_id.startswith("FT-2026-"), f"Expected FT-2026- prefix, got {report_id}"
    assert len(report_id) == 14  # 'FT-2026-' (8 chars) + 6 hex chars = 14 chars

    # 2. Track with exact FT-2026- ID
    track_resp = client.get(f"/api/public/reports/track/{report_id}")
    assert track_resp.status_code == 200, f"Expected 200, got {track_resp.status_code}: {track_resp.text}"
    track_data = track_resp.json()
    assert track_data["success"] is True
    assert track_data["report_id"] == report_id
    assert track_data["category"] == "น้ำเปลี่ยนสี"
    assert track_data["district"] == "กบินทร์บุรี"
    assert track_data["public_status_th"] == "รับเรื่องแล้ว"
    assert track_data["public_status"] == "รับเรื่องแล้ว"
    assert "ได้รับรายงานข้อสังเกต" in track_data["public_description_th"]

    # Strict Privacy: Zero PII or private coordinates
    assert "reporter_phone" not in track_data
    assert "reporter_email" not in track_data
    assert "exact_latitude" not in track_data
    assert "exact_longitude" not in track_data
    assert "reviewer_notes" not in track_data

    # 3. Track non-existent report
    not_found_resp = client.get("/api/public/reports/track/FT-2026-NOTFOUND")
    assert not_found_resp.status_code == 404
    assert "ไม่พบรหัสรายงาน" in not_found_resp.json()["detail"]
