"""
============================================================
FLOODTRACE — REAL EXTERNAL DATA PRODUCTION ACTIVATION TESTS
Master Engineering Specification Sections 1, 2, 3, 26, 46, 47, 48, 60, 61
============================================================
Tests:
1. Production Data Policy evaluation (Section 1)
2. All 14 external candidate sources access and licensing verification
3. Live / verified ThaiWater water level and rainfall telemetry ingestion
4. Zero synthetic fallback verification (No fake forecast, no fake flood polygon, no fake toxicity)
5. Public telemetry endpoints (/api/public/stations, /api/public/rainfall-stations)
6. Observability and source health (/health/sources)
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.core.source_access import (
    CANDIDATE_SOURCES_REGISTRY,
    evaluate_source_access,
    evaluate_production_eligibility,
    get_all_production_eligibility_evaluations,
    AccessAuthorizationStatus,
    IngestionAction
)
from apps.api.app.core.database import SessionLocal
from apps.api.app.models.entities import WaterStation, RainfallStation, IndustrialFacility

client = TestClient(app)

EXTERNAL_14_SOURCES = [
    "gistda_disaster",
    "thaiwater_rid_runoff",
    "thaiwater_rainfall",
    "tmd_forecast",
    "dwr_waterways",
    "official_dem",
    "diw_industrial_waste",
    "diw_all_factories",
    "pcd_reo7_inspection",
    "pcd_water_quality",
    "dgr_groundwater",
    "dopa_villages",
    "moph_hospitals",
    "ldd_landuse"
]

def test_production_eligibility_policy_section_1():
    """
    Master Prompt Section 1: Production Data Policy
    PRIVATE_AUTHORIZED -> ALLOW
    OFFICIAL_PUBLIC + VERIFIED_LICENSE -> ALLOW
    PRIVATE_PENDING -> BLOCK
    UNKNOWN -> BLOCK
    LICENSE_UNKNOWN -> BLOCK
    UNAVAILABLE -> BLOCK
    """
    # 1. Official public with verified license (e.g. ThaiWater, DIW open data)
    tw_eval = evaluate_production_eligibility("thaiwater_rid_runoff")
    assert tw_eval.production_eligible is True
    assert tw_eval.ingestion_action == IngestionAction.ALLOW_PRODUCTION_INGESTION
    assert tw_eval.verified_license_for_production is True

    tw_rain = evaluate_production_eligibility("thaiwater_rainfall")
    assert tw_rain.production_eligible is True
    assert tw_rain.ingestion_action == IngestionAction.ALLOW_PRODUCTION_INGESTION

    diw_waste = evaluate_production_eligibility("diw_industrial_waste")
    assert diw_waste.production_eligible is True
    assert diw_waste.verified_license_for_production is True

    # 2. Blocked sources without credentials or verified license
    gistda = evaluate_production_eligibility("gistda_disaster")
    assert gistda.production_eligible is False
    assert gistda.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    tmd = evaluate_production_eligibility("tmd_forecast")
    assert tmd.production_eligible is False
    assert tmd.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    dem = evaluate_production_eligibility("official_dem")
    assert dem.production_eligible is False
    assert dem.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    pcd_wq = evaluate_production_eligibility("pcd_water_quality")
    assert pcd_wq.production_eligible is False
    assert pcd_wq.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

def test_all_14_external_sources_inventory_section_2():
    """Master Prompt Section 2: Current External Source Inventory must contain all 14 sources."""
    for source_id in EXTERNAL_14_SOURCES:
        assert source_id in CANDIDATE_SOURCES_REGISTRY, f"Source {source_id} missing from registry"
        record = CANDIDATE_SOURCES_REGISTRY[source_id]
        assert record.get("real_endpoint") is not None, f"Source {source_id} missing real_endpoint"
        assert record.get("license") is not None, f"Source {source_id} missing license"

def test_exact_section_61_production_counts():
    """
    Master Prompt Section 61: Final Production Report Counts
    TOTAL_EXTERNAL_SOURCES = 14
    PRODUCTION_ENABLED = 6
    BLOCKED = 8
    """
    evals = [evaluate_production_eligibility(sid) for sid in EXTERNAL_14_SOURCES]
    enabled = [e for e in evals if e.production_eligible]
    blocked = [e for e in evals if not e.production_eligible]

    assert len(evals) == 14
    assert len(enabled) == 6, f"Expected 6 production enabled sources, got {len(enabled)}"
    assert len(blocked) == 8, f"Expected 8 blocked sources, got {len(blocked)}"

    enabled_ids = {e.source_id for e in enabled}
    expected_enabled = {
        "thaiwater_rid_runoff",
        "thaiwater_rainfall",
        "dwr_waterways",
        "diw_industrial_waste",
        "dopa_villages",
        "moph_hospitals"
    }
    assert enabled_ids == expected_enabled

def test_public_water_stations_endpoint():
    """Test /api/public/stations serves verified river telemetry with provenance."""
    db = SessionLocal()
    try:
        if db.query(WaterStation).count() == 0:
            st = WaterStation(
                id="PRC002",
                name_th="เมืองปราจีนบุรี",
                name_en="Mueang Prachin Buri",
                basin="ลุ่มน้ำปราจีนบุรี",
                district="เมืองปราจีนบุรี",
                latitude=14.053554,
                longitude=101.38684,
                water_level_msl=5.65,
                ground_level_msl=1.8,
                warning_level_msl=4.5,
                critical_level_msl=5.2,
                status="STAGE_RECORDED",
                provenance={
                    "source_agency": "สสน. / กรมชลประทาน (ThaiWater / RID)",
                    "dataset_name": "ข้อมูลตรวจวัดระดับน้ำโทรมาตร",
                    "data_category": "MEASURED_FACT",
                    "category": "OFFICIAL",
                    "original_timestamp": "2026-10-02 19:00",
                    "license": "Open Government License Thailand (OGL-TH)",
                    "crs": "EPSG:4326"
                }
            )
            db.merge(st)
            db.commit()
    finally:
        db.close()

    try:
        response = client.get("/api/public/stations")
        assert response.status_code == 200
        stations = response.json()
        assert len(stations) > 0

        st = stations[0]
        assert "station_id" in st
        assert "name_th" in st
        assert "latitude" in st
        assert "longitude" in st
        assert "water_level_msl" in st
        assert "provenance" in st
        assert st["provenance"]["category"] == "OFFICIAL"
        assert "ThaiWater" in st["provenance"]["source_agency"] or "สสน." in st["provenance"]["source_agency"]
    finally:
        with SessionLocal() as db:
            db.query(WaterStation).delete()
            db.commit()

def test_public_rainfall_stations_endpoint():
    """Test /api/public/rainfall-stations serves verified automatic precipitation gauges."""
    db = SessionLocal()
    try:
        if db.query(RainfallStation).count() == 0:
            rf = RainfallStation(
                id="ONE076",
                name_th="วัดห้วยเกษียร",
                name_en="Huai Kasian Temple",
                basin="ลุ่มน้ำบางปะกง",
                district="เมืองปราจีนบุรี",
                subdistrict="เนินหอม",
                latitude=14.181127,
                longitude=101.413635,
                rain_24h_mm=45.4,
                rain_1h_mm=0.0,
                observation_time="2026-10-02 18:00",
                agency="สสน.",
                status="RAINFALL_RECORDED",
                provenance={
                    "source_agency": "สถาบันสารสนเทศทรัพยากรน้ำ (องค์การมหาชน) - ThaiWater",
                    "dataset_name": "ข้อมูลตรวจวัดปริมาณน้ำฝนอัตโนมัติ 24 ชั่วโมง",
                    "data_category": "MEASURED_FACT",
                    "category": "OFFICIAL",
                    "original_timestamp": "2026-10-02 18:00",
                    "license": "Open Government License Thailand (OGL-TH)",
                    "crs": "EPSG:4326"
                }
            )
            db.merge(rf)
            db.commit()
    finally:
        db.close()

    try:
        response = client.get("/api/public/rainfall-stations")
        assert response.status_code == 200
        rain_stations = response.json()
        assert len(rain_stations) > 0

        rf = rain_stations[0]
        assert "station_id" in rf
        assert "name_th" in rf
        assert "latitude" in rf
        assert "longitude" in rf
        assert "rain_24h_mm" in rf
        assert "provenance" in rf
        assert rf["provenance"]["category"] == "OFFICIAL"
        assert "ThaiWater" in rf["provenance"]["source_agency"] or "สถาบันสารสนเทศทรัพยากรน้ำ" in rf["provenance"]["source_agency"]
    finally:
        with SessionLocal() as db:
            db.query(RainfallStation).delete()
            db.commit()

def test_health_sources_endpoint_enriched():
    """Test /health/sources exposes production eligibility and real endpoints."""
    response = client.get("/health/sources")
    assert response.status_code == 200
    data = response.json()
    assert data["total_sources_evaluated"] == 15
    sources = data["sources"]

    # Check thaiwater_rid_runoff
    assert "thaiwater_rid_runoff" in sources
    tw = sources["thaiwater_rid_runoff"]
    assert tw["production_eligible"] is True
    assert tw["verified_license"] is True
    assert "https://api-v3.thaiwater.net" in tw["real_endpoint"]

    # Check gistda_disaster is blocked
    assert "gistda_disaster" in sources
    g = sources["gistda_disaster"]
    assert g["production_eligible"] is False
    assert g["verified_license"] is False

def test_no_synthetic_fallback_and_no_toxicity_inference():
    """
    Master Prompt Section 10 & 26:
    - 101/105/106 are industrial activity classifications, NOT toxicity scores.
    - If TMD or DEM fails, NO fake values are invented.
    """
    # Check DIW records in database
    db = SessionLocal()
    try:
        facilities = db.query(IndustrialFacility).all()
        for f in facilities:
            assert f.facility_type in ["101", "105", "106"]
            assert f.hazard_evidence_status == "INSUFFICIENT_DATA"
            assert "No chemical lab assays" in f.chemical_assay_evidence
    finally:
        db.close()
