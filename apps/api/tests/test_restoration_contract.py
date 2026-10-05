"""Focused regressions for safe legacy telemetry restoration."""

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.core.source_health import has_current_external_request_evidence, model_runtime_status
from apps.api.app.adapters import thaiwater, rid
from apps.api.app.core.config import settings
from apps.api.app.api.public import router as public_router
from apps.api.app.models.entities import CitizenReport, RainfallStation, WaterStation
from apps.api.app.services import spatial_monitoring_service


client = TestClient(app)


class _Rows:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args):
        return self

    def all(self):
        return self.rows

    def count(self):
        return len(self.rows)


class _Database:
    def __init__(self, water=(), rain=(), reports=()):
        self.rows = {
            WaterStation: list(water),
            RainfallStation: list(rain),
            CitizenReport: list(reports),
        }

    def query(self, model):
        return _Rows(self.rows.get(model, []))


def _response(url: str, payload: dict) -> httpx.Response:
    return httpx.Response(200, json=payload, request=httpx.Request("GET", url))


def _water_item(timestamp: str | None = None) -> dict:
    return {
        "geocode": {
            "province_name": {"th": "ปราจีนบุรี"},
            "amphoe_name": {"th": "เมืองปราจีนบุรี"},
        },
        "basin": {"basin_name": {"th": "ลุ่มน้ำปราจีนบุรี"}},
        "station": {
            "tele_station_oldcode": "TW-PB-001",
            "tele_station_name": {"th": "สถานีทดสอบ", "en": "Test station"},
            "tele_station_lat": 14.05,
            "tele_station_long": 101.38,
            "warning_level_m": 2.0,
            "critical_level_msl": 3.0,
        },
        "waterlevel_msl": 2.5,
        "waterlevel_datetime": timestamp or datetime.now(timezone.utc).isoformat(),
    }


def _rain_item(timestamp: str | None = None) -> dict:
    return {
        "geocode": {
            "province_name": {"th": "ปราจีนบุรี"},
            "amphoe_name": {"th": "เมืองปราจีนบุรี"},
        },
        "basin": {"basin_name": {"th": "ลุ่มน้ำปราจีนบุรี"}},
        "station": {
            "tele_station_oldcode": "TW-PB-R001",
            "tele_station_name": {"th": "เครื่องวัดฝนทดสอบ", "en": "Test rain gauge"},
            "tele_station_lat": 14.05,
            "tele_station_long": 101.38,
        },
        "rain_24h": 0,
        "rain_1h": 0,
        "rainfall_datetime": timestamp or datetime.now(timezone.utc).isoformat(),
    }


def test_water_adapter_accepts_valid_official_station_response(monkeypatch):
    async_get = AsyncMock(return_value=_response(settings.THAIWATER_API_URL, {
        "waterlevel_data": {"data": [_water_item()]}
    }))
    monkeypatch.setattr(httpx.AsyncClient, "get", async_get)

    records = asyncio.run(thaiwater.fetch_thaiwater_stations())

    assert len(records) == 1
    assert records[0]["id"] == "TW-PB-001"
    assert records[0]["water_level_msl"] == 2.5
    assert records[0]["provenance"]["source_url"] == settings.THAIWATER_API_URL


def test_rain_adapter_accepts_valid_zero_measurements(monkeypatch):
    async_get = AsyncMock(return_value=_response(settings.THAIWATER_RAIN_API_URL, {
        "data": [_rain_item()]
    }))
    monkeypatch.setattr(httpx.AsyncClient, "get", async_get)

    records = asyncio.run(thaiwater.fetch_thaiwater_rainfall())

    assert len(records) == 1
    assert records[0]["rain_24h_mm"] == 0.0
    assert records[0]["rain_1h_mm"] == 0.0
    assert records[0]["provenance"]["source_url"] == settings.THAIWATER_RAIN_API_URL


def test_water_adapter_rejects_missing_and_future_observation_timestamps(monkeypatch):
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    missing_timestamp = _water_item()
    missing_timestamp["waterlevel_datetime"] = None
    payload = {"waterlevel_data": {"data": [missing_timestamp]}}
    async_get = AsyncMock(return_value=_response(settings.THAIWATER_API_URL, payload))
    monkeypatch.setattr(httpx.AsyncClient, "get", async_get)
    assert asyncio.run(thaiwater.fetch_thaiwater_stations()) == []

    payload["waterlevel_data"]["data"] = [_water_item(future)]
    async_get.return_value = _response(settings.THAIWATER_API_URL, payload)
    assert asyncio.run(thaiwater.fetch_thaiwater_stations()) == []


def test_rid_empty_live_response_does_not_emit_static_reservoirs(monkeypatch):
    async_get = AsyncMock(return_value=_response(settings.RID_RESERVOIR_API_URL, {"data": []}))
    monkeypatch.setattr(httpx.AsyncClient, "get", async_get)

    assert asyncio.run(rid.fetch_rid_reservoirs()) == []
    async_get.assert_not_awaited()
    assert rid._records({"data": []}) == []


def test_external_request_health_requires_recent_valid_request_evidence():
    now = datetime.now(timezone.utc)
    request = {
        "request_started_at": (now - timedelta(seconds=2)).isoformat(),
        "request_finished_at": now.isoformat(),
        "http_status": 200,
        "interval_seconds": 900,
    }
    assert has_current_external_request_evidence("ACTIVE API", request, now) is True
    assert has_current_external_request_evidence("ACTIVE API", {}, now) is False
    assert has_current_external_request_evidence("UNAVAILABLE / UNVERIFIED", request, now) is False
    assert has_current_external_request_evidence("ACTIVE API", {**request, "http_status": True}, now) is False
    stale = {**request, "request_started_at": (now - timedelta(hours=1)).isoformat(), "request_finished_at": (now - timedelta(minutes=59)).isoformat()}
    assert has_current_external_request_evidence("ACTIVE API", stale, now) is False


def test_model_health_requires_recent_usable_forecast_evidence():
    now = datetime.now(timezone.utc)
    success = {"http_status": 200, "usable_days": 7, "request_finished_at": now.isoformat(), "last_error": None}
    assert model_runtime_status(success, now) == "AVAILABLE MODEL"
    assert model_runtime_status({**success, "usable_days": 0}, now) == "UNAVAILABLE"
    assert model_runtime_status({**success, "request_finished_at": (now - timedelta(hours=1)).isoformat()}, now) == "UNAVAILABLE"
    assert model_runtime_status({**success, "http_status": 503, "last_error": "UPSTREAM_HTTP_ERROR"}, now) == "UPSTREAM ERROR"


def test_public_provenance_reports_runtime_evidence_and_conditional_sources(monkeypatch):
    now = datetime.now(timezone.utc)
    provenance = {
        "source_url": settings.THAIWATER_API_URL,
        "scope_filter": "province_name:ปราจีนบุรี",
        "source_verification": "VERIFIED_OFFICIAL",
        "category": "MEASURED_FACT",
        "geocoding_precision": "OFFICIAL_COORDINATES",
        "original_timestamp": now.isoformat(),
    }
    station = SimpleNamespace(
        id="provenance-water", name_th="สถานีทดสอบ", latitude=14.05, longitude=101.38,
        district="เมืองปราจีนบุรี", water_level_msl=0.0, provenance=provenance,
    )
    finished = now.isoformat()
    status = {
        "scheduler_active": True,
        "sources": {
            "thaiwater_rid_runoff": {
                "request_started_at": (now - timedelta(seconds=1)).isoformat(),
                "request_finished_at": finished,
                "http_status": 200,
                "interval_seconds": 900,
                "measurements_received_last_run": 1,
                "automated_refresh": True,
                "last_error": None,
            },
            "thaiwater_rainfall": {},
        },
    }
    monkeypatch.setattr("apps.api.app.core.scheduler.source_scheduler.get_status", lambda: status)
    monkeypatch.setattr("apps.api.app.adapters.openmeteo.get_openmeteo_source_health", lambda: {})

    result = public_router.get_public_provenance_catalog(db=_Database(water=[station]))
    rows = {row["source_id"]: row for row in result["sources"]}

    assert rows["thaiwater_rid_runoff"]["status"] == "AVAILABLE"
    assert rows["thaiwater_rid_runoff"]["database_records"] == 1
    assert rows["thaiwater_rainfall"]["runtime_status"] == "NOT CHECKED"
    assert rows["openmeteo_forecast"]["family"] == "MODEL"
    assert rows["openmeteo_forecast"]["status"] == "UNAVAILABLE"
    assert rows["rid_reservoirs"]["status"] == "ACCESS REQUIRED"


def test_overview_uses_current_verified_telemetry_and_keeps_real_zero():
    now = datetime.now(timezone.utc)
    base_provenance = {
        "scope_filter": "province_name:ปราจีนบุรี",
        "source_verification": "VERIFIED_OFFICIAL",
        "category": "MEASURED_FACT",
        "geocoding_precision": "OFFICIAL_COORDINATES",
        "original_timestamp": now.isoformat(),
    }
    water = SimpleNamespace(
        provenance={**base_provenance, "source_url": settings.THAIWATER_API_URL},
        latitude=14.05, longitude=101.38, district="เมืองปราจีนบุรี",
        water_level_msl=0.0, warning_level_msl=1.0, critical_level_msl=2.0,
    )
    rain = SimpleNamespace(
        provenance={**base_provenance, "source_url": settings.THAIWATER_RAIN_API_URL},
        latitude=14.05, longitude=101.38, district="เมืองปราจีนบุรี",
        rain_24h_mm=0.0, rain_1h_mm=0.0,
    )

    result = public_router.get_public_overview(district="เมืองปราจีนบุรี", db=_Database([water], [rain]))

    assert result["total_water_stations"] == 1
    assert result["available_water_station_count"] == 1
    assert result["total_rainfall_stations"] == 1
    assert result["available_rainfall_station_count"] == 1
    assert result["monitoring_surface_status"] == "AVAILABLE MODEL"
    assert result["priority_counts"]["high"] == 0
    assert result["total_citizen_reports"] == 0
    assert result["source_freshness"]["thaiwater_water_level"] == "CURRENT"


def test_unavailable_rain_source_does_not_hide_available_water_source():
    now = datetime.now(timezone.utc)
    water = SimpleNamespace(
        provenance={
            "source_url": settings.THAIWATER_API_URL,
            "scope_filter": "province_name:ปราจีนบุรี",
            "source_verification": "VERIFIED_OFFICIAL",
            "category": "MEASURED_FACT",
            "geocoding_precision": "OFFICIAL_COORDINATES",
            "original_timestamp": now.isoformat(),
        },
        latitude=14.05, longitude=101.38, district="เมืองปราจีนบุรี",
        water_level_msl=0.0, warning_level_msl=1.0, critical_level_msl=2.0,
    )
    result = public_router.get_public_overview(district="เมืองปราจีนบุรี", db=_Database(water= [water]))

    assert result["available_water_station_count"] == 1
    assert result["available_rainfall_station_count"] == 0
    assert result["monitoring_surface_status"] == "AVAILABLE MODEL"


def test_public_station_routes_return_only_source_verified_station_records():
    now = datetime.now(timezone.utc)
    base_provenance = {
        "scope_filter": "province_name:ปราจีนบุรี",
        "source_verification": "VERIFIED_OFFICIAL",
        "category": "MEASURED_FACT",
        "geocoding_precision": "OFFICIAL_COORDINATES",
        "original_timestamp": now.isoformat(),
    }
    water = SimpleNamespace(
        id="public-water-fixture", name_th="สถานีทดสอบ", latitude=14.05, longitude=101.38,
        district="เมืองปราจีนบุรี", basin="", water_level_msl=0.0, ground_level_msl=None,
        warning_level_msl=None, critical_level_msl=None, status="STAGE_RECORDED",
        provenance={**base_provenance, "source_url": settings.THAIWATER_API_URL},
    )
    rain = SimpleNamespace(
        id="public-rain-fixture", name_th="เครื่องวัดฝนทดสอบ", latitude=14.05, longitude=101.38,
        district="เมืองปราจีนบุรี", subdistrict=None, basin=None, rain_24h_mm=0.0,
        rain_1h_mm=0.0, observation_time=now.isoformat(), agency=None, status="RAINFALL_RECORDED",
        provenance={**base_provenance, "source_url": settings.THAIWATER_RAIN_API_URL},
    )
    db = _Database(water=[water], rain=[rain])

    water_result = public_router.get_public_telemetry_stations(db=db)
    rain_result = public_router.get_public_rainfall_stations(db=db)

    assert len(water_result) == len(rain_result) == 1
    assert water_result[0].station_id == "public-water-fixture"
    assert water_result[0].water_level_msl == 0.0
    assert rain_result[0].station_id == "public-rain-fixture"
    assert rain_result[0].rain_24h_mm == 0.0


def test_forecast_endpoint_returns_openmeteo_as_forecast_model(monkeypatch):
    from apps.api.app.adapters import openmeteo

    monkeypatch.setattr(openmeteo, "_FORECAST_CACHE", {})
    request_url = settings.OPEN_METEO_API_URL
    payload = {
        "timezone": "Asia/Bangkok",
        "daily_units": {"time": "iso8601", "precipitation_sum": "mm"},
        "daily": {
            "time": ["2026-10-05"],
            "precipitation_sum": [0.0],
            "precipitation_probability_max": [0],
            "precipitation_hours": [0.0],
        },
    }
    async_get = AsyncMock(return_value=_response(request_url, payload))
    monkeypatch.setattr(httpx.AsyncClient, "get", async_get)

    response = client.get("/api/v1/forecast/?station=prachin_mueang")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AVAILABLE"
    assert data["source_provenance"]["provider"] == "Open-Meteo"
    assert data["source_provenance"]["family"] == "MODEL"
    assert data["forecast_days"][0]["precipitation_sum_mm"] == 0.0
    assert "test_mode" not in {p["name"] for p in app.openapi()["paths"]["/api/v1/forecast/"]["get"].get("parameters", [])}


def test_monitoring_point_builder_requires_current_source_evidence():
    builder = getattr(spatial_monitoring_service, "build_station_priority_points", None)
    assert callable(builder), "A direct verified-station model surface builder is required."

    now = datetime.now(timezone.utc)
    water = type("Station", (), {
        "id": "private-source-id-not-for-output",
        "name_th": "Sensitive station identity",
        "latitude": 14.05,
        "longitude": 101.38,
        "district": "เมืองปราจีนบุรี",
        "water_level_msl": 2.5,
        "warning_level_msl": 2.0,
        "critical_level_msl": 3.0,
        "last_updated": now,
        "provenance": {
            "source_url": settings.THAIWATER_API_URL,
            "source_agency": "Hydroinformatics Institute (HII) / ThaiWater",
            "category": "MEASURED_FACT",
            "geocoding_precision": "OFFICIAL_COORDINATES",
            "original_timestamp": now.isoformat(),
            "scope_filter": "province_name:ปราจีนบุรี",
            "source_verification": "VERIFIED_OFFICIAL",
            "transformation": "upstream province metadata: ปราจีนบุรี",
        },
    })()
    stale = type("Station", (), {
        "name_th": water.name_th,
        "latitude": water.latitude,
        "longitude": water.longitude,
        "district": water.district,
        "water_level_msl": water.water_level_msl,
        "warning_level_msl": water.warning_level_msl,
        "critical_level_msl": water.critical_level_msl,
        "last_updated": water.last_updated,
        "id": "stale",
        "provenance": {**water.provenance, "original_timestamp": "2020-01-01T00:00:00Z"},
    })()

    result = builder([water, stale], [], now=now)

    assert result["status"] == "AVAILABLE MODEL"
    assert len(result["features"]) == 1
    feature = result["features"][0]
    assert feature["geometry"]["type"] == "Point"
    assert feature["properties"]["priority_level"] == "HIGH"
    assert "station_id" not in feature["properties"]
    assert "station_name" not in feature["properties"]
