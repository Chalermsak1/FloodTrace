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
from apps.api.app.adapters import openmeteo

@pytest.mark.parametrize("status_code", [401, 403, 404, 429, 500])
def test_thaiwater_http_errors_handled_safely(status_code):
    """
    The adapter propagates upstream failures so the scheduler cannot record false success.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        f"HTTP {status_code}", request=MagicMock(), response=mock_resp
    )

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with pytest.raises(httpx.HTTPStatusError):
            asyncio.run(fetch_thaiwater_stations())


def test_thaiwater_timeout_handled_safely():
    """
    Verifies that a network timeout remains a failed request for scheduler health.
    """
    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Connection timed out")):
        with pytest.raises(httpx.TimeoutException):
            asyncio.run(fetch_thaiwater_stations())


def test_thaiwater_malformed_json_handled_safely():
    """
    Verifies that invalid JSON remains a malformed upstream response.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.side_effect = ValueError("Invalid JSON response syntax")

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with pytest.raises(ValueError):
            asyncio.run(fetch_thaiwater_rainfall())


def test_openmeteo_degraded_state_on_failure():
    """
    Verifies Open-Meteo returns a safe fallback dictionary with 'error' or empty forecast
    rather than fabricating fake precipitation.
    """
    openmeteo._FORECAST_CACHE.clear()
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Network unreachable")):
        forecast = asyncio.run(openmeteo.fetch_openmeteo_forecast("prachin_mueang"))
        assert isinstance(forecast, dict)
        assert forecast["status"] == "UNAVAILABLE"
        assert forecast["forecast_days"] == []
        assert forecast["reason"] == "UPSTREAM_UNAVAILABLE"
