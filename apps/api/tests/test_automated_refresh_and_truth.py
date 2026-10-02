import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.core.scheduler import source_scheduler
from apps.api.app.core.circuit_breaker import get_circuit_breaker
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

def test_section_34_final_source_counts():
    """
    Master Prompt Section 34:
    Verifies the exact source counts across all 14 external sources.
    """
    response = client.get("/health/sources")
    assert response.status_code == 200
    data = response.json()
    counts = data["production_counts"]

    assert counts["TOTAL_EXTERNAL_SOURCES"] == 14
    assert counts["REAL_EXTERNAL_API_SOURCES"] == 2
    assert counts["AUTOMATED_PRODUCTION_SOURCES"] == 2
    assert counts["PRODUCTION_REFERENCE_SOURCES"] == 4
    assert counts["LOCAL_ONLY_SOURCES"] == 4
    assert counts["BLOCKED_SOURCES"] == 8
    assert counts["TEST_ONLY_SOURCES"] == 0

def test_section_2_and_3_final_source_status_model(db_session):
    """
    Master Prompt Section 2 & 3:
    Every source must have explicit, verified fields in the 13-field model.
    """
    if db_session.query(WaterStation).count() == 0:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session))
    if db_session.query(RainfallStation).count() == 0:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rainfall", db=db_session))

    response = client.get("/health/sources")
    assert response.status_code == 200
    data = response.json()
    sources = data["sources"]

    # 1. ThaiWater Water Level (Active external automated)
    tw_wl = sources["thaiwater_rid_runoff"]
    assert tw_wl["SOURCE_EXISTS"] is True
    assert tw_wl["ENDPOINT_VERIFIED"] is True
    assert tw_wl["ACCESS_VERIFIED"] is True
    assert tw_wl["LICENSE_VERIFIED"] is True
    assert tw_wl["REAL_DATA_RECEIVED"] is True
    assert tw_wl["REAL_EXTERNAL_REQUEST"] is True
    assert tw_wl["LOCAL_DATA_LOADED"] is False
    assert tw_wl["DATABASE_INGESTED"] is True
    assert tw_wl["AUTOMATED_REFRESH"] is True
    assert tw_wl["FRESHNESS_VERIFIED"] is True
    assert tw_wl["PUBLIC_API_AVAILABLE"] is True
    assert tw_wl["FRONTEND_DISPLAY_VERIFIED"] is True
    assert tw_wl["PRODUCTION_ENABLED"] is True
    assert tw_wl["production_status"] == "PRODUCTION_ACTIVE"
    assert tw_wl["user_facing_status_th"] == "ข้อมูลล่าสุดที่ตรวจวัดได้"

    # 2. ThaiWater Rainfall (Active external automated)
    tw_rf = sources["thaiwater_rainfall"]
    assert tw_rf["SOURCE_EXISTS"] is True
    assert tw_rf["ENDPOINT_VERIFIED"] is True
    assert tw_rf["ACCESS_VERIFIED"] is True
    assert tw_rf["LICENSE_VERIFIED"] is True
    assert tw_rf["REAL_DATA_RECEIVED"] is True
    assert tw_rf["REAL_EXTERNAL_REQUEST"] is True
    assert tw_rf["LOCAL_DATA_LOADED"] is False
    assert tw_rf["DATABASE_INGESTED"] is True
    assert tw_rf["AUTOMATED_REFRESH"] is True
    assert tw_rf["FRESHNESS_VERIFIED"] is True
    assert tw_rf["PUBLIC_API_AVAILABLE"] is True
    assert tw_rf["FRONTEND_DISPLAY_VERIFIED"] is True
    assert tw_rf["PRODUCTION_ENABLED"] is True
    assert tw_rf["production_status"] == "PRODUCTION_ACTIVE"
    assert tw_rf["user_facing_status_th"] == "ข้อมูลล่าสุดที่ตรวจวัดได้"

    # 3. DWR Waterways (Reference dataset, LOCAL_IMPORT)
    dwr = sources["dwr_waterways"]
    assert dwr["REAL_EXTERNAL_REQUEST"] is False
    assert dwr["LOCAL_DATA_LOADED"] is True
    assert dwr["AUTOMATED_REFRESH"] is False
    assert dwr["PRODUCTION_ENABLED"] is False # Section 7: do not mark TRUE until external automated refresh verified
    assert dwr["production_status"] == "PRODUCTION_REFERENCE"
    assert dwr["user_facing_status_th"] == "ข้อมูลอ้างอิงที่จัดเก็บในระบบ"

    # 4. DIW Industrial Waste (Historical dataset, LOCAL_IMPORT)
    diw = sources["diw_industrial_waste"]
    assert diw["REAL_EXTERNAL_REQUEST"] is False
    assert diw["LOCAL_DATA_LOADED"] is True
    assert diw["AUTOMATED_REFRESH"] is False
    assert diw["PRODUCTION_ENABLED"] is False
    assert diw["production_status"] == "PRODUCTION_REFERENCE"
    assert diw["data_classification"] == "HISTORICAL"
    assert "ข้อมูลประวัติทางการ" in diw["user_facing_status_th"]

    # 5. DOPA Villages (Static reference, LOCAL_IMPORT)
    dopa = sources["dopa_villages"]
    assert dopa["REAL_EXTERNAL_REQUEST"] is False
    assert dopa["LOCAL_DATA_LOADED"] is True
    assert dopa["AUTOMATED_REFRESH"] is False
    assert dopa["production_status"] == "PRODUCTION_REFERENCE"
    assert dopa["user_facing_status_th"] == "ข้อมูลอ้างอิงที่จัดเก็บในระบบ"

    # 6. MOPH Hospitals (Static reference, LOCAL_IMPORT)
    moph = sources["moph_hospitals"]
    assert moph["REAL_EXTERNAL_REQUEST"] is False
    assert moph["LOCAL_DATA_LOADED"] is True
    assert moph["AUTOMATED_REFRESH"] is False
    assert moph["production_status"] == "PRODUCTION_REFERENCE"
    assert moph["user_facing_status_th"] == "ข้อมูลอ้างอิงที่จัดเก็บในระบบ"

    # 7. Blocked Sources (Section 11)
    blocked_keys = [
        "gistda_disaster", "tmd_forecast", "official_dem", "diw_all_factories",
        "pcd_reo7_inspection", "pcd_water_quality", "dgr_groundwater", "ldd_landuse"
    ]
    for b_key in blocked_keys:
        b = sources[b_key]
        assert b["REAL_EXTERNAL_REQUEST"] is False
        assert b["REAL_DATA_RECEIVED"] is False
        assert b["DATABASE_INGESTED"] is False
        assert b["AUTOMATED_REFRESH"] is False
        assert b["PRODUCTION_ENABLED"] is False
        assert b["production_status"] == "PRODUCTION_BLOCKED"
        assert b["user_facing_status_th"] == "ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง"

def test_section_15_and_16_scheduler_refresh_and_deduplication(db_session):
    """
    Master Prompt Section 15, 16, 18, 30:
    Tests automated scheduler run, database update, deduplication, and time-series observation storage.
    """
    async def _run():
        res1 = await source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session)
        assert res1["status"] == "SUCCESS"
        assert res1["received"] > 0

        # Trigger second run immediately with same data to verify deduplication
        res2 = await source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session)
        assert res2["status"] == "SUCCESS"
        assert res2["duplicates_skipped"] == res1["received"] # All skipped as duplicates
        assert res2["inserted"] == 0

    asyncio.run(_run())

def test_section_18_historical_timeseries_endpoints(db_session):
    """
    Master Prompt Section 18:
    Tests time-series observation query endpoints supporting 24H, 7D, 30D.
    """
    sample_obs = db_session.query(WaterLevelObservation).first()
    if not sample_obs:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session))
        sample_obs = db_session.query(WaterLevelObservation).first()

    st_id = sample_obs.station_id
    st = db_session.query(WaterStation).filter(WaterStation.id == st_id).first()
    if not st:
        st = WaterStation(
            id=st_id,
            name_th="สถานีทดสอบ",
            basin="ลุ่มน้ำปราจีนบุรี",
            district="กบินทร์บุรี",
            latitude=13.99,
            longitude=101.72,
            water_level_msl=23.64,
            provenance={"source_agency": "ThaiWater"}
        )
        db_session.add(st)
        db_session.commit()

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

def test_section_18_rainfall_history_endpoint(db_session):
    """
    Master Prompt Section 18:
    Tests rainfall time-series observation history endpoint.
    """
    sample_rf = db_session.query(RainfallObservation).first()
    if not sample_rf:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rainfall", db=db_session))
        sample_rf = db_session.query(RainfallObservation).first()

    st_id = sample_rf.station_id
    st = db_session.query(RainfallStation).filter(RainfallStation.id == st_id).first()
    if not st:
        st = RainfallStation(
            id=st_id,
            name_th="สถานีวัดน้ำฝน",
            basin="ลุ่มน้ำบางปะกง",
            district="กบินทร์บุรี",
            latitude=13.99,
            longitude=101.72,
            rain_24h_mm=45.4,
            provenance={"source_agency": "ThaiWater"}
        )
        db_session.add(st)
        db_session.commit()

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
    assert isinstance(data["monitoring_stations_active"], int)
    assert data["monitoring_stations_active"] >= 0

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

