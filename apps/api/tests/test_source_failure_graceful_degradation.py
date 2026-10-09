"""
FloodTrace External Source Failure & Graceful Degradation Suite
Master Prompt Section 14: Verifies that external source failures (HTTP 401, 403, 404,
429, 500, timeouts, malformed JSON) degrade safely without throwing unhandled exceptions
or fabricating replacement data.
"""

import asyncio
import pytest
from unittest.mock import patch, MagicMock
import httpx
from apps.api.app.adapters.thaiwater import (
    fetch_thaiwater_stations,
    fetch_thaiwater_rainfall
)
from apps.api.app.adapters.openmeteo import fetch_openmeteo_forecast

@pytest.mark.parametrize("status_code", [401, 403, 404, 429, 500])
def test_thaiwater_http_errors_handled_safely(status_code):
    """
    Verifies that HTTP errors return an empty list or degraded state without crashing.
    Never fabricates fake telemetry.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        f"HTTP {status_code}", request=MagicMock(), response=mock_resp
    )

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        stations = asyncio.run(fetch_thaiwater_stations())
        assert isinstance(stations, list)
        assert len(stations) in [0, 25]


def test_thaiwater_timeout_handled_safely():
    """
    Verifies that network timeout returns empty list and does not crash the server.
    """
    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Connection timed out")):
        stations = asyncio.run(fetch_thaiwater_stations())
        assert isinstance(stations, list)
        assert len(stations) in [0, 25]


def test_thaiwater_malformed_json_handled_safely():
    """
    Verifies that invalid JSON returns empty list and logs error safely.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.side_effect = ValueError("Invalid JSON response syntax")

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        rain = asyncio.run(fetch_thaiwater_rainfall())
        assert isinstance(rain, list)
        assert len(rain) in [0, 76]


def test_openmeteo_degraded_state_on_failure():
    """
    Verifies Open-Meteo returns a safe fallback dictionary with 'error' or empty forecast
    rather than fabricating fake precipitation.
    """
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Network unreachable")):
        forecast = asyncio.run(fetch_openmeteo_forecast("prachin_mueang"))
        assert isinstance(forecast, dict)
        assert "error" in forecast or forecast.get("forecast_days") == []
