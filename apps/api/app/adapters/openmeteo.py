"""Forecast selector metadata and fail-closed response for blocked forecast inputs."""
from typing import Dict, Any

STATIONS_COORDINATES = {
    "prachin_mueang": {"lat": 14.0535, "lon": 101.3868},
    "kabin_buri": {"lat": 13.9912, "lon": 101.7231},
    "si_maha_phot": {"lat": 13.8824, "lon": 101.5218},
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


async def fetch_openmeteo_forecast(station_key: str = "prachin_mueang", is_test_mode: bool = False) -> Dict[str, Any]:
    """Return unavailable until an eligible forecast integration is verified."""
    return {
        "status": "FORECAST_UNAVAILABLE",
        "reason": "ACCESS_BLOCKED",
        "forecast_days": [],
        "selector": get_forecast_selector(station_key),
        "source_provenance": None,
    }
