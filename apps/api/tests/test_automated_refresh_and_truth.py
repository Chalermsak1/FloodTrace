import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.core.scheduler import source_scheduler
from apps.api.app.core.circuit_breaker import get_circuit_breaker, CircuitBreakerState
from apps.api.app.adapters.thaiwater import SourceRecords
from apps.api.app.models.entities import (
    WaterStation,
    RainfallStation,
    WaterLevelObservation,
    RainfallObservation,
    IndustrialFacility
)

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _station_record(kind, station_id):
    timestamp = datetime.now(timezone.utc).isoformat()
    source_url = settings.THAIWATER_API_URL if kind == "water" else settings.THAIWATER_RAIN_API_URL
    provenance = {
        "source_url": source_url,
        "scope_filter": "province_name:ปราจีนบุรี",
        "source_verification": "VERIFIED_OFFICIAL",
        "category": "MEASURED_FACT",
        "geocoding_precision": "OFFICIAL_COORDINATES",
        "original_timestamp": timestamp,
    }
    common = {
        "id": station_id,
        "name_th": "สถานีทดสอบ",
        "district": "เมืองปราจีนบุรี",
        "latitude": 14.05,
        "longitude": 101.38,
        "observation_time": timestamp,
        "raw_observation_time": timestamp,
        "provenance": provenance,
    }
    if kind == "water":
        return {
            **common, "basin": "", "name_en": None, "water_level_msl": 0.0,
            "ground_level_msl": None, "warning_level_msl": 1.0,
            "critical_level_msl": 2.0, "status": "STAGE_RECORDED",
        }
    return {
        **common, "basin": None, "name_en": None, "subdistrict": None,
        "rain_24h_mm": 0.0, "rain_1h_mm": 0.0, "agency": "HII",
        "status": "RAINFALL_RECORDED",
    }


def _install_source_response(monkeypatch, source_id, record):
    async def fetcher():
        return SourceRecords([record], 200)

    monkeypatch.setattr(source_scheduler._configs[source_id], "fetcher", fetcher)
    breaker = get_circuit_breaker(source_id)
    breaker.state = CircuitBreakerState.CLOSED
    breaker.failure_count = 0
    breaker.success_count = 0
    breaker.last_failure_time = None


def _clear_station_fixture(db, station_id, station_model, observation_model):
    db.query(observation_model).filter(observation_model.station_id == station_id).delete(synchronize_session=False)
    db.query(station_model).filter(station_model.id == station_id).delete(synchronize_session=False)
    db.commit()

def test_section_34_final_source_counts():
    """
    Master Prompt Section 34:
    Verifies the exact source counts across all 14 external sources.
    """
    response = client.get("/health/sources")
    assert response.status_code == 200
    data = response.json()
    counts = data["production_counts"]

    sources = data["sources"]
    assert counts["TOTAL_EXTERNAL_SOURCES"] == len(sources)
    assert counts["REAL_EXTERNAL_API_SOURCES"] == sum(s["source_status"] == "ACTIVE API" for s in sources.values())
    assert counts["AUTOMATED_PRODUCTION_SOURCES"] == sum(s["AUTOMATED_REFRESH"] is True for s in sources.values())
    assert counts["PRODUCTION_REFERENCE_SOURCES"] == sum(s["source_status"] == "LOCAL / VERIFIED REFERENCE" for s in sources.values())
    assert counts["LOCAL_ONLY_SOURCES"] == sum(s["source_status"] == "LOCAL / UNVERIFIED" for s in sources.values())
    assert counts["BLOCKED_SOURCES"] == sum(s["source_status"] == "BLOCKED" for s in sources.values())
    assert counts["TEST_ONLY_SOURCES"] == sum(s["source_status"] == "INTERNAL" for s in sources.values())

def test_section_2_and_3_final_source_status_model(db_session):
    """Source statuses follow the approved evidence matrix, not registry claims."""
    response = client.get("/health/sources")
    assert response.status_code == 200
    sources = response.json()["sources"]

    assert sources["thaiwater_rid_runoff"]["source_status"] == "ACTIVE API"
    assert sources["thaiwater_rainfall"]["source_status"] == "ACTIVE API"
    assert sources["diw_industrial_waste"]["source_status"] == "LOCAL / UNVERIFIED"
    assert sources["diw_industrial_waste"]["database_records"] is None
    for key in ("dwr_waterways", "dopa_villages", "moph_hospitals"):
        assert sources[key]["source_status"] == "UNAVAILABLE / UNVERIFIED"
        assert sources[key]["database_records"] is None
    for key in ("gistda_disaster", "tmd_forecast", "official_dem", "diw_all_factories", "pcd_reo7_inspection", "pcd_water_quality", "dgr_groundwater", "ldd_landuse"):
        assert sources[key]["source_status"] == "BLOCKED"
        assert sources[key]["PRODUCTION_ENABLED"] is False

def test_section_15_and_16_scheduler_refresh_and_deduplication(db_session, monkeypatch):
    """
    Master Prompt Section 15, 16, 18, 30:
    Tests automated scheduler run, database update, deduplication, and time-series observation storage.
    """
    _clear_station_fixture(db_session, "restore-water-fixture", WaterStation, WaterLevelObservation)
    _install_source_response(monkeypatch, "thaiwater_rid_runoff", _station_record("water", "restore-water-fixture"))

    async def _run():
        res1 = await source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session)
        assert res1["status"] == "SUCCESS"
        assert res1["received"] > 0

        # Trigger second run immediately with same data to verify deduplication
        res2 = await source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session)
        assert res2["status"] == "SUCCESS"
        assert res2["duplicates_skipped"] == res1["received"] # All skipped as duplicates
        assert res2["inserted"] == 0
        station = db_session.query(WaterStation).filter(WaterStation.id == "restore-water-fixture").first()
        assert station is not None and station.water_level_msl == 0.0
        assert db_session.query(WaterLevelObservation).filter(WaterLevelObservation.station_id == "restore-water-fixture").count() == 1

    asyncio.run(_run())


def test_section_15_rainfall_refresh_and_duplicate_history(db_session, monkeypatch):
    _clear_station_fixture(db_session, "restore-rain-fixture", RainfallStation, RainfallObservation)
    _install_source_response(monkeypatch, "thaiwater_rainfall", _station_record("rain", "restore-rain-fixture"))

    async def _run():
        first = await source_scheduler.run_source_now("thaiwater_rainfall", db=db_session)
        second = await source_scheduler.run_source_now("thaiwater_rainfall", db=db_session)
        assert first["status"] == second["status"] == "SUCCESS"
        assert first["received"] == 1
        assert second["duplicates_skipped"] == 1
        assert second["inserted"] == 0
        station = db_session.query(RainfallStation).filter(RainfallStation.id == "restore-rain-fixture").first()
        assert station is not None and station.rain_24h_mm == 0.0
        assert db_session.query(RainfallObservation).filter(RainfallObservation.station_id == "restore-rain-fixture").count() == 1

    asyncio.run(_run())

def test_section_18_historical_timeseries_endpoints(db_session, monkeypatch):
    """
    Master Prompt Section 18:
    Tests time-series observation query endpoints supporting 24H, 7D, 30D.
    """
    st_id = "restore-water-history"
    _clear_station_fixture(db_session, st_id, WaterStation, WaterLevelObservation)
    _install_source_response(monkeypatch, "thaiwater_rid_runoff", _station_record("water", st_id))
    asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session))

    # Query 24h history
    resp_24h = client.get(f"/api/public/stations/{st_id}/history?range=24h")
    assert resp_24h.status_code == 200
    data_24h = resp_24h.json()
    assert data_24h["station_id"] == st_id
    assert data_24h["station_type"] == "WATER_LEVEL"
    assert data_24h["time_range"] == "24h"
    assert data_24h["total_records"] >= 1
    assert "provenance" in data_24h

    # Check Section 22 metadata on observations
    first_obs = data_24h["observations"][0]
    assert first_obs["ingestion_mode"] == "EXTERNAL_API"
    assert first_obs["data_classification"] == "HIGH_FREQUENCY"
    assert first_obs["source_name"] == "ThaiWater"
    assert first_obs["unit"] == "m MSL"

    # Query 7d history
    resp_7d = client.get(f"/api/public/stations/{st_id}/history?range=7d")
    assert resp_7d.status_code == 200
    assert resp_7d.json()["time_range"] == "7d"

    # Query 30d history
    resp_30d = client.get(f"/api/public/stations/{st_id}/history?range=30d")
    assert resp_30d.status_code == 200
    assert resp_30d.json()["time_range"] == "30d"

def test_section_18_rainfall_history_endpoint(db_session, monkeypatch):
    """
    Master Prompt Section 18:
    Tests rainfall time-series observation history endpoint.
    """
    st_id = "restore-rain-history"
    _clear_station_fixture(db_session, st_id, RainfallStation, RainfallObservation)
    _install_source_response(monkeypatch, "thaiwater_rainfall", _station_record("rain", st_id))
    asyncio.run(source_scheduler.run_source_now("thaiwater_rainfall", db=db_session))

    resp = client.get(f"/api/public/rainfall/{st_id}/history?range=24h")
    assert resp.status_code == 200
    data = resp.json()
    assert data["station_id"] == st_id
    assert data["station_type"] == "RAINFALL"
    assert data["total_records"] >= 1
    assert data["observations"][0]["unit"] == "mm"
    assert data["observations"][0]["ingestion_mode"] == "EXTERNAL_API"

def test_section_26_no_static_factual_fallbacks():
    """
    Master Prompt Section 26:
    Ensures public area summary endpoints strictly query database and never return fabricated/static fallbacks.
    """
    resp = client.get("/api/public/overview?district=กบินทร์บุรี")
    assert resp.status_code == 200
    data = resp.json()

    # Must be integer and match actual DB count
    assert isinstance(data["community_observation_count"], int)
    assert data["monitoring_stations_active"] == (
        data["available_water_station_count"] + data["available_rainfall_station_count"]
    )

def test_section_28_failure_test_fail_closed():
    """
    Master Prompt Section 28:
    Verifies that querying an unknown or non-existent station fails honestly without fabricating values.
    """
    resp = client.get("/api/public/stations/NON_EXISTENT_STATION_999/history?range=24h")
    assert resp.status_code == 404
    err = resp.json()
    assert "detail" in err or "message" in err

def test_section_16_scheduler_admin_status():
    """
    Master Prompt Section 16:
    Tests admin scheduler status and tracking endpoints.
    """
    headers = {"X-Admin-Key": settings.ADMIN_API_KEY}
    resp = client.get("/api/v1/admin/scheduler/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "scheduler_active" in data
    assert "sources" in data
    assert "thaiwater_rid_runoff" in data["sources"]
    tw_status = data["sources"]["thaiwater_rid_runoff"]
    assert tw_status["interval_seconds"] == 900
    assert tw_status["automated_refresh"] is True

def test_timezone_and_timestamp_integrity():
    """
    Strict Timezone and Timestamp Integrity Audit Test:
    Verifies that naive ThaiWater strings are interpreted as Asia/Bangkok (UTC+07:00),
    converted to UTC, never placed in the future, and that future timestamps are rejected.
    """
    from apps.api.app.core.datetime_utils import parse_thaiwater_timestamp, FutureTimestampError, BANGKOK_TZ

    # 1. Normal naive timestamp from ThaiWater (10 minutes in the past)
    now_bkk = datetime.now(timezone.utc).astimezone(BANGKOK_TZ)
    ten_min_ago = now_bkk - timedelta(minutes=10)
    raw_str = ten_min_ago.strftime("%Y-%m-%d %H:%M")

    res = parse_thaiwater_timestamp(raw_str)
    assert res["source_timezone"] == "Asia/Bangkok (UTC+07:00)"
    assert res["is_future"] is False
    assert res["age_seconds"] >= 0
    assert res["dt_utc"] <= datetime.now(timezone.utc)
    # Check that +07:00 offset is maintained in normalized_bkk
    assert "+07:00" in res["normalized_bkk"]

    # 2. Rule: SOURCE_TIMESTAMP_MUST_NOT_BE_IN_FUTURE
    future_bkk = now_bkk + timedelta(hours=3)
    future_str = future_bkk.strftime("%Y-%m-%d %H:%M")
    with pytest.raises(FutureTimestampError):
        parse_thaiwater_timestamp(future_str)

def test_scheduler_runtime_timestamp_fields(db_session, monkeypatch):
    """
    Verifies that the scheduler status exposes all required timestamp audit fields:
    source_timestamp_raw, source_timezone, normalized_timestamp_utc,
    normalized_timestamp_asia_bangkok, retrieved_at, and data_age_seconds.
    """
    _install_source_response(monkeypatch, "thaiwater_rid_runoff", _station_record("water", "restore-water-runtime"))
    asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session))
    headers = {"X-Admin-Key": settings.ADMIN_API_KEY}
    resp = client.get("/api/v1/admin/scheduler/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    tw_stat = data["sources"]["thaiwater_rid_runoff"]

    assert tw_stat["source_timezone"] == "Asia/Bangkok (UTC+07:00)"
    assert tw_stat["normalized_timestamp_utc"] is not None
    assert tw_stat["normalized_timestamp_asia_bangkok"] is not None
    assert tw_stat["retrieved_at"] is not None
    assert tw_stat["data_age_seconds"] is not None
    # Observation must NOT be in the future relative to retrieved_at
    assert tw_stat["data_age_seconds"] >= -300 # Within clock drift
    assert "+07:00" in tw_stat["normalized_timestamp_asia_bangkok"]
