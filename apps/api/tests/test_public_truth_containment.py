from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
import pytest

from apps.api.app.core.database import SessionLocal
from apps.api.app.core.config import settings
from apps.api.app.core.scheduler import source_scheduler
from apps.api.app.main import app
from apps.api.app.models.entities import RainfallStation, Reservoir, WaterStation

client = TestClient(app)


@pytest.fixture
def empty_telemetry_db():
    db = SessionLocal()
    water = db.query(WaterStation).all()
    rain = db.query(RainfallStation).all()
    reservoirs = db.query(Reservoir).all()
    db.expunge_all()
    db.query(WaterStation).delete()
    db.query(RainfallStation).delete()
    db.query(Reservoir).delete()
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    for model_rows in (water, rain, reservoirs):
        for row in model_rows:
            db.merge(row)
    db.commit()
    db.close()


def test_public_geometry_alert_forecast_and_official_updates_fail_closed(empty_telemetry_db):
    for path in (
        "/api/public/map/boundary",
        "/api/public/map/monitoring-priority",
        "/api/public/zones",
        "/api/public/flood-extent",
        "/api/public/forecast-zones",
        "/api/public/waterways",
    ):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json().get("features") == []
    assert client.get("/api/v1/alerts/").json() == []
    assert client.get("/api/public/official-updates").json() == []


def test_source_health_uses_null_evidence_and_reconciled_aggregates(empty_telemetry_db):
    response = client.get("/health/sources")
    assert response.status_code == 200
    data = response.json()
    sources = data["sources"]
    assert data["total_sources_evaluated"] == len(sources)
    assert sources["thaiwater_rid_runoff"]["source_status"] == "ACTIVE API"
    assert sources["thaiwater_rid_runoff"]["database_records"] == 0
    assert sources["thaiwater_rid_runoff"]["latest_source_timestamp"] is None
    assert sources["thaiwater_rid_runoff"]["FRESHNESS_VERIFIED"] is False
    assert sources["thaiwater_rid_runoff"]["reason_code"] == "TIMESTAMP_UNAVAILABLE"
    assert sources["diw_industrial_waste"]["source_status"] == "LOCAL / UNVERIFIED"
    assert sources["diw_industrial_waste"]["database_records"] is None
    assert sources["diw_industrial_waste"]["reason_code"] == "LOCAL_PROVENANCE_UNVERIFIED"
    for key in ("dwr_waterways", "dopa_villages", "moph_hospitals"):
        assert sources[key]["source_status"] == "UNAVAILABLE / UNVERIFIED"
        assert sources[key]["database_records"] is None
    assert sources["tmd_forecast"]["source_status"] == "BLOCKED"
    counts = data["production_counts"]
    assert counts["TOTAL_EXTERNAL_SOURCES"] == len(sources)
    assert counts["REAL_EXTERNAL_API_SOURCES"] == sum(s["source_status"] == "ACTIVE API" for s in sources.values())
    assert counts["LOCAL_ONLY_SOURCES"] == sum(s["source_status"] == "LOCAL / UNVERIFIED" for s in sources.values())
    assert counts["BLOCKED_SOURCES"] == sum(s["source_status"] == "BLOCKED" for s in sources.values())


def test_real_external_request_requires_current_scheduler_evidence(empty_telemetry_db, monkeypatch):
    def check(source_id, scheduler_source):
        monkeypatch.setattr(source_scheduler, "get_status", lambda: {"sources": {source_id: scheduler_source}})
        response = client.get("/health/sources")
        assert response.status_code == 200
        return response.json()["sources"][source_id]

    active_without_request = check("thaiwater_rid_runoff", {})
    assert active_without_request["source_status"] == "ACTIVE API"
    assert active_without_request["REAL_EXTERNAL_REQUEST"] is False

    now = datetime.now(timezone.utc)
    valid_request = {
        "request_started_at": (now - timedelta(seconds=2)).isoformat(),
        "request_finished_at": now.isoformat(),
        "http_status": 200,
        "interval_seconds": 900,
    }
    assert check("thaiwater_rid_runoff", valid_request)["REAL_EXTERNAL_REQUEST"] is True

    stale_request = {
        **valid_request,
        "request_started_at": (now - timedelta(seconds=1000)).isoformat(),
        "request_finished_at": (now - timedelta(seconds=998)).isoformat(),
    }
    assert check("thaiwater_rid_runoff", stale_request)["REAL_EXTERNAL_REQUEST"] is False

    unavailable_source = check("dwr_waterways", valid_request)
    assert unavailable_source["source_status"] != "ACTIVE API"
    assert unavailable_source["REAL_EXTERNAL_REQUEST"] is False


def test_public_overview_has_no_substitute_time_or_priority():
    data = client.get("/api/public/overview").json()
    assert data["system_updated_at_th"] is None
    assert data["system_updated_at_iso"] is None
    assert data["priority_counts"] is None
    assert data["verification_priority"] == "ไม่สามารถยืนยันได้"
    assert data["data_freshness"] == "ไม่สามารถยืนยันได้"


def test_public_station_preserves_real_zero_and_fails_closed_for_stale_or_malformed(empty_telemetry_db):
    db = SessionLocal()
    current_timestamp = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    verified_provenance = {
        "source_url": settings.THAIWATER_API_URL,
        "scope_filter": "province_name:ปราจีนบุรี",
        "source_verification": "VERIFIED_OFFICIAL",
        "geocoding_precision": "OFFICIAL_COORDINATES",
        "source_agency": "ThaiWater", "category": "OFFICIAL",
    }
    common = {
        "name_th": "Fixture station", "latitude": 14.0, "longitude": 101.38,
        "water_level_msl": 0.0,
    }
    db.add_all([
        WaterStation(id="truth-current-zero", basin="Fixture basin", **common, provenance={**verified_provenance, "original_timestamp": current_timestamp}),
        WaterStation(id="truth-stale", basin="Fixture basin", **common, provenance={**verified_provenance, "original_timestamp": "2020-01-01T00:00:00Z"}),
        WaterStation(id="truth-malformed", basin="Fixture basin", **common, provenance={**verified_provenance, "original_timestamp": "not-a-time"}),
    ])
    db.commit()
    db.close()

    response = client.get("/api/public/stations")
    assert response.status_code == 200
    stations = {row["station_id"]: row for row in response.json()}
    assert stations["truth-current-zero"]["water_level_msl"] == 0.0
    assert stations["truth-stale"]["water_level_msl"] is None
    assert stations["truth-stale"]["freshness_status"] == "HISTORICAL"
    assert stations["truth-malformed"]["water_level_msl"] is None
    assert stations["truth-malformed"]["source_timestamp"] is None
    assert stations["truth-malformed"]["freshness_status"] == "UNKNOWN"
    db = SessionLocal()
    db.query(WaterStation).filter(WaterStation.id.in_(["truth-current-zero", "truth-stale", "truth-malformed"])).delete(synchronize_session=False)
    db.commit()
    db.close()
    db = SessionLocal()
    db.query(WaterStation).filter(WaterStation.id.in_(["truth-current-zero", "truth-stale", "truth-malformed"])).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_source_verifier_supports_only_evidence_based_result_states():
    from scripts.verify_all_sources import classify_source, public_provenance_reconciles, source_health_reconciles

    assert classify_source({"source_status": "BLOCKED"}) == "BLOCKED"
    assert classify_source({"source_status": "UNAVAILABLE / UNVERIFIED"}) == "UNAVAILABLE"
    assert classify_source({"source_status": "LOCAL / UNVERIFIED"}) == "UNVERIFIED"
    assert classify_source({
        "source_status": "ACTIVE API", "SOURCE_EXISTS": True, "ENDPOINT_VERIFIED": True,
        "LICENSE_VERIFIED": True, "PUBLIC_API_AVAILABLE": True,
        "DATABASE_INGESTED": True, "FRESHNESS_VERIFIED": True,
        "database_records": 2, "latest_source_timestamp": "2026-10-04T00:00:00Z",
    }) == "PARTIAL"  # Persisted/source metadata without current scheduler evidence cannot certify ACTIVE API.
    assert classify_source({"source_status": "ACTIVE API", "database_records": 0}) == "PARTIAL"
    assert classify_source({"api_key_present": True, "upstream_http_status": 200}) == "UNVERIFIED"
    assert classify_source(None) == "PARTIAL"
    assert classify_source({"source_status": "ACTIVE API", "database_records": 1, "latest_source_timestamp": "now"}) == "PARTIAL"
    assert public_provenance_reconciles({"sources": [
        {"source_id": "openmeteo_forecast", "source_status": "AVAILABLE MODEL"},
        {"source_id": "rid_reservoirs", "source_status": "ACCESS REQUIRED"},
    ]})
    assert not public_provenance_reconciles({"sources": [{"source_status": "unexpected"}]})
    good = {"sources": {"a": {"source_status": "ACTIVE API", "AUTOMATED_REFRESH": True}}, "production_counts": {
        "TOTAL_EXTERNAL_SOURCES": 1, "REAL_EXTERNAL_API_SOURCES": 1, "AUTOMATED_PRODUCTION_SOURCES": 1,
        "PRODUCTION_REFERENCE_SOURCES": 0, "LOCAL_ONLY_SOURCES": 0, "BLOCKED_SOURCES": 0, "TEST_ONLY_SOURCES": 0,
    }}
    assert source_health_reconciles(good)
    good["production_counts"]["BLOCKED_SOURCES"] = 1
    assert not source_health_reconciles(good)


def test_forecast_selectors_are_not_official_stations():
    from apps.api.app.adapters.openmeteo import STATIONS_COORDINATES, get_forecast_selector

    for key in STATIONS_COORDINATES:
        selector = get_forecast_selector(key)
        assert selector["coordinate_role"] == "APPLICATION_SELECTOR"
        assert selector["provenance"]["source_status"] == "LOCAL / UNVERIFIED"
        assert "official coordinate" in selector["provenance"]["limitation"]
        assert "station_name" not in selector
    response = client.get("/api/v1/forecast/?station=missing")
    assert response.status_code == 400
