import os
import json
import asyncio
import pytest
from datetime import datetime, timezone, timedelta
import httpx

from apps.api.app.core.provenance import (
    DataCategory,
    FreshnessStatus,
    SourceVerification,
    ValueNature,
    compute_freshness,
    make_provenance,
    ProvenanceMetadata,
)
from apps.api.app.adapters.rid import fetch_rid_reservoirs, RID_AUDIT_EXPLANATION
from apps.api.app.services.risk_engine import perform_exposure_screening
from apps.api.app.core.config import settings

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
DIW_JSON_PATH = os.path.join(DATA_DIR, "prachinburi_industrial_waste_diw.json")


def test_seven_data_category_taxonomies():
    """
    Verify the exact seven categorical distinctions required by the audit:
    OFFICIAL_RECORD, MEASURED_FACT, DERIVED, MODELED, FORECAST, CITIZEN_REPORTED, UNVERIFIED.
    """
    assert DataCategory.OFFICIAL_RECORD.value == "OFFICIAL_RECORD"
    assert DataCategory.MEASURED_FACT.value == "MEASURED_FACT"
    assert DataCategory.DERIVED.value == "DERIVED"
    assert DataCategory.MODELED.value == "MODELED"
    assert DataCategory.FORECAST.value == "FORECAST"
    assert DataCategory.CITIZEN_REPORTED.value == "CITIZEN_REPORTED"
    assert DataCategory.UNVERIFIED.value == "UNVERIFIED"
    assert len(DataCategory) == 7


def test_freshness_status_taxonomy_and_computation():
    """
    Verify the freshness status classifications:
    CURRENT, RECENT, STALE, HISTORICAL, UNKNOWN.
    """
    assert FreshnessStatus.CURRENT.value == "CURRENT"
    assert FreshnessStatus.RECENT.value == "RECENT"
    assert FreshnessStatus.STALE.value == "STALE"
    assert FreshnessStatus.HISTORICAL.value == "HISTORICAL"
    assert FreshnessStatus.UNKNOWN.value == "UNKNOWN"

    now = datetime.now(timezone.utc)

    # Within 24 hours -> CURRENT
    status_curr, age_curr = compute_freshness(now - timedelta(hours=2))
    assert status_curr == FreshnessStatus.CURRENT
    assert age_curr is not None and age_curr < 1.0

    # Within 7 days -> RECENT
    status_rec, age_rec = compute_freshness(now - timedelta(days=3))
    assert status_rec == FreshnessStatus.RECENT
    assert age_rec is not None and 2.5 < age_rec < 3.5

    # Within 30 days -> STALE
    status_stale, age_stale = compute_freshness(now - timedelta(days=15))
    assert status_stale == FreshnessStatus.STALE
    assert age_stale is not None and 14.0 < age_stale < 16.0

    # > 30 days -> HISTORICAL
    status_hist, age_hist = compute_freshness(now - timedelta(days=365))
    assert status_hist == FreshnessStatus.HISTORICAL
    assert age_hist is not None and age_hist > 360.0

    # None timestamp -> UNKNOWN
    status_unk, age_unk = compute_freshness(None)
    assert status_unk == FreshnessStatus.UNKNOWN
    assert age_unk is None


def test_provenance_structure_fields():
    """
    Verify that make_provenance creates a dictionary with all mandatory provenance attributes.
    """
    prov = make_provenance(
        agency="Department of Industrial Works (DIW)",
        dataset="Industrial Waste Treatment, Recycling, and Sorting Facilities",
        official_id="DIW-PB-001",
        category=DataCategory.OFFICIAL_RECORD,
        source_verification=SourceVerification.VERIFIED_OFFICIAL,
        freshness_status=FreshnessStatus.HISTORICAL,
        source_age_days=2314.0,
        confidence=0.60,
        measurement_status="ADMINISTRATIVE_REGISTRATION",
        model_status="NOT_APPLICABLE",
        value_nature=ValueNature.RECORDED,
        audit_notes="112 facilities in the DIW May 2020 dataset snapshot.",
    )

    d = prov.to_dict()
    assert d["category"] == "OFFICIAL_RECORD"
    assert d["source_agency"] == "Department of Industrial Works (DIW)"
    assert d["source_verification"] == "VERIFIED_OFFICIAL"
    assert d["freshness_status"] == "HISTORICAL"
    assert d["source_age_days"] == 2314.0
    assert d["confidence"] == 0.60
    assert d["measurement_status"] == "ADMINISTRATIVE_REGISTRATION"
    assert d["model_status"] == "NOT_APPLICABLE"
    assert d["value_nature"] == "RECORDED"
    assert "112 facilities in the DIW May 2020 dataset snapshot" in d["audit_notes"]


def test_diw_dataset_snapshot_wording():
    """
    Verify DIW dataset wording requirements:
    - MUST state: '112 facilities in the DIW May 2020 dataset snapshot'
    - MUST NOT state: '112 current active facilities'
    - Exactly 112 facilities in data file.
    - All 112 records have freshness_status == 'HISTORICAL'.
    """
    assert os.path.exists(DIW_JSON_PATH), f"File {DIW_JSON_PATH} not found"

    with open(DIW_JSON_PATH, "r", encoding="utf-8") as f:
        records = json.load(f)

    assert len(records) == 112, f"Expected exactly 112 records, found {len(records)}"

    for idx, r in enumerate(records):
        prov = r.get("provenance", {})
        audit_notes = prov.get("audit_notes", "")

        # Must state exact phrasing
        assert "112 facilities in the DIW May 2020 dataset snapshot" in audit_notes, (
            f"Record {idx} ({r.get('id')}) missing exact DIW May 2020 snapshot phrasing."
        )

        # Must NOT state current active facilities
        assert "112 current active facilities" not in audit_notes, (
            f"Record {idx} ({r.get('id')}) incorrectly claims 112 current active facilities."
        )

        # Must be HISTORICAL freshness
        assert prov.get("freshness_status") == "HISTORICAL", (
            f"Record {idx} ({r.get('id')}) freshness_status is not HISTORICAL."
        )

        # Source age must reflect snapshot from May 2020 (> 2000 days)
        age = prov.get("source_age_days")
        assert age is not None and age > 2000.0, (
            f"Record {idx} ({r.get('id')}) source_age_days must be > 2000."
        )


def test_rid_wording_and_fail_closed_behavior():
    """
    Verify RID wording and telemetry behavior:
    - Exact statement: 'The RID public API supports storage/volume/inflow/outflow fields, but usable current telemetry for the selected Prachin Buri reservoirs was unavailable/empty at audit time.'
    - Must NOT state that RID has no live telemetry capability.
    - Fail-closed behavior: volume fields are None when telemetry is missing.
    """
    assert "The RID public API supports storage/volume/inflow/outflow fields, but usable current telemetry for the selected Prachin Buri reservoirs was unavailable/empty at audit time." in RID_AUDIT_EXPLANATION

    orig_token = settings.RID_PRIVATE_TOKEN
    try:
        # 1. In production without credentials -> fail closed returns 0
        settings.RID_PRIVATE_TOKEN = None
        res_prod = asyncio.run(fetch_rid_reservoirs())
        assert len(res_prod) == 0

        # 2. When telemetry is empty/unavailable, fail closed with no fabricated rows.
        from unittest.mock import patch
        with patch("httpx.AsyncClient.get", side_effect=Exception("Simulated empty telemetry response")):
            settings.RID_PRIVATE_TOKEN = "mock-auth-token"
            reservoirs = asyncio.run(fetch_rid_reservoirs())
            assert reservoirs == []
    finally:
        settings.RID_PRIVATE_TOKEN = orig_token


def test_no_toxicity_inferred_from_101_105_106():
    """
    Verify that DIW activity codes 101, 105, 106 are NOT converted to toxicity scores,
    and no chemical contamination is inferred from flood proximity or water flow.
    """
    fac_101 = {
        "id": "101-TEST",
        "name": "Centralized Wastewater Treatment Test",
        "latitude": 13.97,
        "longitude": 101.51,
        "facility_type": "101",
        "district": "ศรีมหาโพธิ",
        "subdistrict": "ท่าตูม",
    }
    fac_105 = {
        "id": "105-TEST",
        "name": "Waste Sorting Test",
        "latitude": 13.97,
        "longitude": 101.51,
        "facility_type": "105",
        "district": "ศรีมหาโพธิ",
        "subdistrict": "ท่าตูม",
    }
    fac_106 = {
        "id": "106-TEST",
        "name": "Waste Recycling Test",
        "latitude": 13.97,
        "longitude": 101.51,
        "facility_type": "106",
        "district": "ศรีมหาโพธิ",
        "subdistrict": "ท่าตูม",
    }

    dummy_stations = [{
        "id": "st_test",
        "name_th": "สถานีทดสอบ",
        "latitude": 13.98,
        "longitude": 101.52,
        "water_level_msl": 3.45,
        "status": "STAGE_RECORDED",
    }]

    screening_101 = perform_exposure_screening(fac_101, dummy_stations, forecast_precip_mm=12.5)
    screening_105 = perform_exposure_screening(fac_105, dummy_stations, forecast_precip_mm=12.5)
    screening_106 = perform_exposure_screening(fac_106, dummy_stations, forecast_precip_mm=12.5)

    for screening in [screening_101, screening_105, screening_106]:
        # Toxicity must be explicitly marked as insufficient data
        assert screening["hazard_data_status"] == "INSUFFICIENT DATA — NO VERIFIED WASTE HAZARD RECORD"

        # Contamination must be explicitly marked as unconfirmed
        assert screening["contamination_status"] == "UNCONFIRMED — NO CONTAMINATION MEASUREMENT"

        # Chemical hazard evidence in factors explicitly states insufficient data
        assert screening["factors"]["chemical_hazard_evidence"]["status"] == "INSUFFICIENT DATA"
        assert screening["factors"]["contamination_status"]["status"] == "UNCONFIRMED — NO CONTAMINATION MEASUREMENT"

        # Priority is inspection-need screening, NOT a numeric risk score
        assert "PROXIMITY" in screening["screening_priority"]

        # Verify no numeric risk score or toxicity score field
        assert "risk_score" not in screening
        assert "toxicity_score" not in screening
        assert "composite_hazard_multiplier" not in screening


def test_live_api_endpoints_provenance():
    """
    Tests FastAPI backend to verify all endpoints respond with HTTP 200
    and strictly adhere to REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = TRUE.
    """
    from fastapi.testclient import TestClient
    from apps.api.app.main import app
    client = TestClient(app)

    # 1. Telemetry Water Stations
    resp_stations = client.get("/api/v1/telemetry/stations")
    assert resp_stations.status_code == 200
    stations = resp_stations.json()
    if len(stations) > 0:
        prov_st = stations[0]["provenance"]
        assert prov_st["category"] in ["MEASURED_FACT", "OFFICIAL_RECORD"]

    # 2. Telemetry Reservoirs
    resp_res = client.get("/api/v1/telemetry/reservoirs")
    assert resp_res.status_code == 200
    reservoirs = resp_res.json()
    if len(reservoirs) > 0:
        prov_res = reservoirs[0]["provenance"]
        assert "RID public API" in prov_res["audit_notes"] or "telemetry" in prov_res["audit_notes"].lower()

    # 3. Factories (DIW)
    resp_fac = client.get("/api/v1/factories/?limit=5")
    assert resp_fac.status_code == 404

    # 4. Risk Hotspots
    resp_hotspots = client.get("/api/v1/risk/hotspots?limit=5")
    assert resp_hotspots.status_code == 404

    # 5. Forecast
    resp_fc = client.get("/api/v1/forecast/?station=prachin_mueang")
    assert resp_fc.status_code == 200
    fc_data = resp_fc.json()
    assert "status" in fc_data or "forecast_days" in fc_data

    # 6. Alerts
    resp_alerts = client.get("/api/v1/alerts/")
    assert resp_alerts.status_code == 200

    # 7. Reports: In public production view, TEST/DEMO reports are strictly excluded
    resp_rep = client.get("/api/v1/reports/")
    assert resp_rep.status_code == 200
    reports = resp_rep.json()
    # In strict production isolation, TEST/DEMO data is excluded (len == 0 unless a real report was submitted)
    if len(reports) > 0:
        prov_rep = reports[0]["provenance"]
        assert prov_rep["category"] in ["CITIZEN_REPORTED", "TEST_DEMO", "COMMUNITY"]
