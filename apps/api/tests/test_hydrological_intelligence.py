"""
Tests for Hydrological Map Intelligence System
Verifies:
1. Waterway GeoJSON features and status evaluation rules (Red/Orange/Green/Blue/Gray).
2. Station-to-waterway matching confidence states (HIGH_CONFIDENCE, REQUIRES_REVIEW, UNMATCHED).
3. Stations that require review or are unmatched do NOT influence river reach status.
4. Area intelligence endpoint returns aggregated real data (water, rain, news, evidence, citizen reports, timeline).
5. Defensible provenance and limitations notice.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.core.database import SessionLocal
from apps.api.app.core.scheduler import source_scheduler
from apps.api.app.models.entities import WaterStation, RainfallStation
from apps.api.app.services.hydrology_service import HydrologicalIntelligenceService, PRACHIN_WATERWAY_REACHES

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_telemetry_stations():
    with SessionLocal() as db:
        if db.query(WaterStation).count() == 0:
            asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db))
        if db.query(RainfallStation).count() == 0:
            asyncio.run(source_scheduler.run_source_now("thaiwater_rainfall", db=db))
    yield

def test_waterways_status_evaluation():
    """Verify waterways endpoint returns GeoJSON with status evaluations and summary counts."""
    response = client.get("/api/public/waterways")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "status_summary" in data
    assert "matching_summary" in data

    summary = data["status_summary"]
    assert "critical_count" in summary
    assert "watch_count" in summary
    assert "normal_count" in summary
    assert "unmonitored_count" in summary
    assert summary["total_segments"] == len(PRACHIN_WATERWAY_REACHES)

    features = data["features"]
    assert len(features) >= 10

    # Ensure every feature has required hydrological visualization attributes
    for f in features:
        props = f["properties"]
        assert "monitoring_status" in props
        assert props["monitoring_status"] in {"CRITICAL", "WATCH", "NORMAL", "NO_DATA", "UNMONITORED"}
        assert "color" in props
        assert props["color"] in {"#ef4444", "#f59e0b", "#10b981", "#94a3b8", "#0284c7"}
        assert "match_confidence" in props
        assert "river_name" in props
        assert "status_label_th" in props

def test_stations_matching_metadata():
    """Verify stations endpoint exposes defensible matching confidence and basis."""
    response = client.get("/api/public/stations")
    assert response.status_code == 200
    stations = response.json()
    assert len(stations) > 0

    confidences = set()
    for s in stations:
        assert "match_confidence" in s
        assert s["match_confidence"] in {"HIGH_CONFIDENCE", "REQUIRES_REVIEW", "UNMATCHED"}
        confidences.add(s["match_confidence"])
        assert "match_basis" in s
        assert s["match_basis"] is not None

        if s["match_confidence"] == "HIGH_CONFIDENCE":
            assert s["matched_waterway_name"] is not None
            assert s["distance_to_waterway_km"] is not None

    # We should have all three categories present across our 27 stations
    assert "HIGH_CONFIDENCE" in confidences
    assert "REQUIRES_REVIEW" in confidences
    assert "UNMATCHED" in confidences

def test_unmatched_stations_do_not_color_waterways():
    """Verify that an ambiguous or unmatched station never colors a waterway segment."""
    db = SessionLocal()
    try:
        stations = db.query(WaterStation).all()
        for s in stations:
            minfo = HydrologicalIntelligenceService.match_station_to_waterway(s)
            if minfo["match_confidence"] != "HIGH_CONFIDENCE":
                # Ensure this station is NOT the primary station for any reach
                for r in PRACHIN_WATERWAY_REACHES:
                    if r.get("primary_station_id") == s.id:
                        pytest.fail(f"Station {s.id} with confidence {minfo['match_confidence']} cannot be primary for {r['name']}")
    finally:
        db.close()

def test_area_intelligence_endpoint_district():
    """Verify area intelligence returns aggregated telemetry, news, evidence, reports, and timeline."""
    response = client.get("/api/public/area-intelligence?district=กบินทร์บุรี")
    assert response.status_code == 200
    data = response.json()

    assert "overview" in data
    assert data["overview"]["district"] == "กบินทร์บุรี"
    assert "water_and_rainfall" in data
    assert "news" in data
    assert "external_evidence" in data
    assert "citizen_reports" in data
    assert "timeline" in data
    assert "data_limitations" in data

    # Verify water & rainfall stations in district
    water_stations = data["water_and_rainfall"]["water_stations"]
    assert isinstance(water_stations, list)
    for ws in water_stations:
        assert ws["district"] == "กบินทร์บุรี"
        assert "match_confidence" in ws

    # Verify timeline sorting (descending)
    timeline = data["timeline"]
    assert isinstance(timeline, list)
    if len(timeline) > 1:
        for i in range(len(timeline) - 1):
            t1 = timeline[i].get("timestamp") or ""
            t2 = timeline[i + 1].get("timestamp") or ""
            assert t1 >= t2, f"Timeline must be chronological descending: {t1} >= {t2}"

def test_area_intelligence_reach():
    """Verify selecting a river reach returns focused hydrology intelligence."""
    response = client.get("/api/public/area-intelligence?reach_id=seg_prachin_kabin")
    assert response.status_code == 200
    data = response.json()

    assert data["overview"]["scope_type"] == "RIVER_REACH"
    assert "แม่น้ำปราจีนบุรี ตอนบน" in data["overview"]["title"]
    assert len(data["water_and_rainfall"]["reaches"]) >= 1
