"""Open-Meteo forecast adapter. Forecast values remain MODEL data."""

import math
import time
from datetime import datetime, timezone, date
from typing import Any, Dict, Optional

import httpx

from apps.api.app.core.config import settings


STATIONS_COORDINATES = {
    "prachin_mueang": {"lat": 14.0535, "lon": 101.3868},
    "kabin_buri": {"lat": 13.9912, "lon": 101.7231},
    "si_maha_phot": {"lat": 13.8824, "lon": 101.5218},
}
CACHE_TTL_SECONDS = 300
_FORECAST_CACHE: Dict[str, Dict[str, Any]] = {}
_SOURCE_HEALTH: Dict[str, Any] = {
    "request_started_at": None,
    "request_finished_at": None,
    "http_status": None,
    "last_error": None,
    "retrieved_at": None,
    "usable_days": 0,
}


def get_forecast_selector(selector_key: str) -> Dict[str, Any]:
    point = STATIONS_COORDINATES.get(selector_key)
    if point is None:
        raise ValueError("Unknown forecast selector")
    return {
        "selector_key": selector_key,
        "selector_label": "Forecast model selection point",
        "selector_label_th": "จุดเลือกพื้นที่สำหรับแบบจำลองพยากรณ์",
        "latitude": point["lat"],
        "longitude": point["lon"],
        "coordinate_role": "APPLICATION_SELECTOR",
        "provenance": {
            "family": "MODEL",
            "method": "application-defined representative point",
            "source_status": "LOCAL / UNVERIFIED",
            "limitation": "This point is neither a monitoring station nor an official coordinate.",
        },
    }


def get_openmeteo_source_health() -> Dict[str, Any]:
    return dict(_SOURCE_HEALTH)


def _optional_number(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return result if math.isfinite(result) else None


def _unavailable(selector: Dict[str, Any], reason: str) -> Dict[str, Any]:
    return {
        "status": "UNAVAILABLE",
        "reason": reason,
        "forecast_days": [],
        "selector": selector,
        "source_provenance": {
            "family": "MODEL",
            "role": "FORECAST",
            "provider": "Open-Meteo",
            "source_status": "UNAVAILABLE",
            "retrieved_at": None,
            "forecast_issue_time": None,
            "limitations": "Forecast is not an observation or flood extent. Application selector is not a station.",
        },
    }


async def fetch_openmeteo_forecast(station_key: str = "prachin_mueang") -> Dict[str, Any]:
    """Fetch a bounded, provider-selected numerical forecast without test-mode bypass."""
    selector = get_forecast_selector(station_key)
    cached = _FORECAST_CACHE.get(station_key)
    now_monotonic = time.monotonic()
    if cached and now_monotonic - cached["cached_at"] < CACHE_TTL_SECONDS:
        return {**cached["result"], "cache_status": "CACHED"}

    params = {
        "latitude": selector["latitude"],
        "longitude": selector["longitude"],
        "daily": "precipitation_sum,precipitation_probability_max,precipitation_hours",
        "timezone": "Asia/Bangkok",
        "forecast_days": 7,
    }
    started = datetime.now(timezone.utc)
    _SOURCE_HEALTH.update({
        "request_started_at": started.isoformat(),
        "request_finished_at": None,
        "http_status": None,
        "last_error": None,
        "usable_days": 0,
    })
    try:
        async with httpx.AsyncClient(timeout=settings.TIMEOUT_NORMAL_SECONDS) as client:
            response = await client.get(settings.OPEN_METEO_API_URL, params=params, headers={"User-Agent": "Ruwaigon/1.0 forecast client"})
            _SOURCE_HEALTH["http_status"] = response.status_code
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict) or not isinstance(payload.get("daily"), dict):
            raise ValueError("FORECAST_SCHEMA_INVALID")

        daily = payload["daily"]
        dates = daily.get("time")
        if not isinstance(dates, list):
            raise ValueError("FORECAST_SCHEMA_INVALID")
        units = payload.get("daily_units") if isinstance(payload.get("daily_units"), dict) else {}
        daily_rows = []
        for index, forecast_date in enumerate(dates):
            if not isinstance(forecast_date, str):
                continue
            try:
                date.fromisoformat(forecast_date)
            except ValueError:
                continue

            def at(key: str) -> Optional[float]:
                values = daily.get(key)
                return _optional_number(values[index]) if isinstance(values, list) and index < len(values) else None

            rain = at("precipitation_sum")
            probability = at("precipitation_probability_max")
            rain_hours = at("precipitation_hours")
            if rain is None and probability is None and rain_hours is None:
                continue
            daily_rows.append({
                "date": forecast_date,
                "precipitation_sum_mm": rain,
                "precipitation_probability_max_pct": probability,
                "precipitation_hours": rain_hours,
                "units": {
                    "precipitation_sum": units.get("precipitation_sum"),
                    "precipitation_probability_max": units.get("precipitation_probability_max"),
                    "precipitation_hours": units.get("precipitation_hours"),
                },
            })
        if not daily_rows:
            raise ValueError("FORECAST_DATA_UNAVAILABLE")

        retrieved_at = datetime.now(timezone.utc).isoformat()
        _SOURCE_HEALTH.update({
            "request_finished_at": retrieved_at,
            "retrieved_at": retrieved_at,
            "usable_days": len(daily_rows),
            "last_error": None,
        })
        result = {
            "status": "AVAILABLE",
            "reason": None,
            "forecast_days": daily_rows,
            "selector": selector,
            "source_provenance": {
                "family": "MODEL",
                "role": "FORECAST",
                "provider": "Open-Meteo",
                "endpoint_family": "Open-Meteo Forecast API",
                "source_status": "AVAILABLE MODEL",
                "model_name": payload.get("model") if isinstance(payload.get("model"), str) else None,
                "model_description": "Numerical weather forecast returned by Open-Meteo; the selected underlying model is not identified unless the response supplies it.",
                "forecast_issue_time": None,
                "retrieved_at": retrieved_at,
                "horizon_start": daily_rows[0]["date"],
                "horizon_end": daily_rows[-1]["date"],
                "horizon_days": len(daily_rows),
                "limitations": "Forecast is not an observation, flood extent, laboratory result, or source attribution. The application selector is not a monitoring station.",
            },
        }
        _FORECAST_CACHE[station_key] = {"cached_at": now_monotonic, "result": result}
        return result
    except httpx.HTTPStatusError as exc:
        _SOURCE_HEALTH.update({"request_finished_at": datetime.now(timezone.utc).isoformat(), "last_error": "UPSTREAM_HTTP_ERROR"})
        return _unavailable(selector, "UPSTREAM_HTTP_ERROR")
    except httpx.HTTPError:
        _SOURCE_HEALTH.update({"request_finished_at": datetime.now(timezone.utc).isoformat(), "last_error": "UPSTREAM_UNAVAILABLE"})
        return _unavailable(selector, "UPSTREAM_UNAVAILABLE")
    except (TypeError, ValueError):
        _SOURCE_HEALTH.update({"request_finished_at": datetime.now(timezone.utc).isoformat(), "last_error": "MALFORMED_RESPONSE"})
        return _unavailable(selector, "MALFORMED_RESPONSE")
