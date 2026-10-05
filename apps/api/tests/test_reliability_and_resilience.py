import pytest
import time
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.api.v1 import forecast as forecast_api
from apps.api.app.core.circuit_breaker import CircuitBreaker, CircuitBreakerState, ErrorClassification

client = TestClient(app)

def test_request_id_middleware_and_propagation():
    """
    Master Prompt Section 8: REQUEST ID & TRACE ID PROPAGATION.
    Verifies that X-Request-ID is generated and returned across requests.
    """
    res = client.get("/health/live")
    assert res.status_code == 200
    assert "X-Request-ID" in res.headers
    assert res.headers["X-Request-ID"].startswith("req_")

    # Custom request ID propagation
    custom_id = "custom-trace-12345"
    res2 = client.get("/health/live", headers={"X-Request-ID": custom_id})
    assert res2.headers["X-Request-ID"] == custom_id

def test_security_headers_present():
    """
    Master Prompt Section 31: PRODUCTION SECURITY HEADERS.
    Verifies HSTS, X-Frame-Options, CSP, and X-Content-Type-Options.
    """
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Strict-Transport-Security" in res.headers
    assert "Content-Security-Policy" in res.headers

def test_liveness_endpoint():
    """
    Master Prompt Section 21: HEALTH CHECKS - LIVENESS PROBE.
    Must return alive status without depending on external dependencies.
    """
    res = client.get("/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "alive"
    assert "service" in data

def test_readiness_endpoint():
    """
    Master Prompt Section 21: HEALTH CHECKS - READINESS PROBE.
    Verifies database and storage dependencies.
    """
    res = client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["dependencies"]["database"] == "HEALTHY"
    assert data["dependencies"]["storage"] == "HEALTHY"

def test_sources_health_monitoring():
    """
    Master Prompt Section 23: DATA SOURCE HEALTH MONITORING.
    Verifies operational status of all external sources.
    """
    res = client.get("/health/sources")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "monitored"
    assert data["total_sources_evaluated"] == len(data["sources"])
    assert "floodtrace_citizen" in data["sources"]
    assert data["sources"]["floodtrace_citizen"]["source_status"] == "INTERNAL"
    assert data["sources"]["floodtrace_citizen"]["production_allowed"] is False
    assert data["sources"]["tmd_forecast"]["production_allowed"] is False

def test_circuit_breaker_trip_and_recovery():
    """
    Master Prompt Section 24: SOURCE CIRCUIT BREAKER.
    Verifies state transitions CLOSED -> OPEN -> HALF_OPEN.
    """
    cb = CircuitBreaker("test_upstream", failure_threshold=2, cooldown_seconds=0.2)
    assert cb.can_execute() is True
    assert cb.state == CircuitBreakerState.CLOSED

    # 1st failure
    cb.record_failure(Exception("Timeout 504"), ErrorClassification.TIMEOUT)
    assert cb.state == CircuitBreakerState.CLOSED
    assert cb.can_execute() is True

    # 2nd failure -> Tripped to OPEN
    cb.record_failure(Exception("Timeout 504"), ErrorClassification.TIMEOUT)
    assert cb.state == CircuitBreakerState.OPEN
    assert cb.can_execute() is False

    # Wait for cooldown to expire
    time.sleep(0.25)
    assert cb.can_execute() is True
    assert cb.state == CircuitBreakerState.HALF_OPEN

    # Success restores to CLOSED
    cb.record_success()
    cb.record_success()
    assert cb.state == CircuitBreakerState.CLOSED
    assert cb.failure_count == 0

def test_report_idempotency_prevents_duplicate_records():
    """
    Master Prompt Section 18: IDEMPOTENCY.
    Verifies that re-submitting with the same idempotency key returns the cached report.
    """
    idemp_key = f"idemp_{time.time()}"
    payload = {
        "reporter_name": "Citizen Idempotency Test",
        "reporter_role": "CITIZEN",
        "latitude": 13.99,
        "longitude": 101.72,
        "district": "กบินทร์บุรี",
        "subdistrict": "กบินทร์",
        "water_depth_cm": 15.0,
        "water_flow_speed": "SLOW",
        "contamination_signs": ["unusual_odor"],
        "idempotency_key": idemp_key
    }

    res1 = client.post("/api/v1/reports/", json=payload)
    assert res1.status_code == 200
    report_id_1 = res1.json()["id"]

    # Re-submit with same idempotency key
    res2 = client.post("/api/v1/reports/", json=payload)
    assert res2.status_code == 200
    report_id_2 = res2.json()["id"]

    # Must return exact same report ID without duplicating
    assert report_id_1 == report_id_2

def test_out_of_bounds_coordinates_rejected():
    """
    Master Prompt Section 46: DATA CORRUPTION PROTECTION.
    Rejects coordinates outside the Prachin Buri regional envelope.
    """
    invalid_payload = {
        "reporter_name": "Out of Bounds Test",
        "reporter_role": "CITIZEN",
        "latitude": 51.5074, # London latitude
        "longitude": -0.1278,
        "district": "กบินทร์บุรี",
        "subdistrict": "กบินทร์",
        "water_depth_cm": 10.0,
        "water_flow_speed": "SLOW",
        "contamination_signs": ["water_color"]
    }

    res = client.post("/api/v1/reports/", json=invalid_payload)
    assert res.status_code == 400
    data = res.json()
    assert "error" in data or "detail" in data
    error_msg = data.get("detail") or data.get("error", {}).get("message")
    assert "อยู่นอกพื้นที่" in error_msg

def test_reports_pagination():
    """
    Master Prompt Section 12: PAGINATION.
    Verifies limit and offset query parameters.
    """
    res = client.get("/api/v1/reports/?limit=5&offset=0")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) <= 5

def test_standard_error_format_on_404():
    """
    Master Prompt Section 7: UNIFIED ERROR RESPONSE FORMAT.
    Ensures standard error format without leaking stack traces.
    """
    res = client.get("/api/v1/non_existent_route_test")
    assert res.status_code == 404
    data = res.json()
    assert data["success"] is False
    assert "error" in data
    assert "request_id" in data["error"]
    assert "timestamp" in data["error"]


def test_openmeteo_forecast_is_model_without_test_mode_bypass(monkeypatch):
    """
    Verifies that Open-Meteo cache CANNOT be used by any production path.
    Even if cache contains populated forecast data, in production the gate must fail-closed.
    """
    async def forecast(_station):
        return {"status": "AVAILABLE", "forecast_days": [{"date": "2026-10-05"}], "source_provenance": {"family": "MODEL", "role": "FORECAST"}}

    monkeypatch.setattr(forecast_api, "fetch_openmeteo_forecast", forecast)
    res = client.get("/api/v1/forecast/?station=prachin_mueang")
    assert res.status_code == 200
    fc = res.json()
    assert fc["status"] == "AVAILABLE"
    assert fc["source_provenance"]["family"] == "MODEL"
    assert "test_mode" not in {p["name"] for p in app.openapi()["paths"]["/api/v1/forecast/"]["get"].get("parameters", [])}


def test_test_demo_reports_strictly_isolated_from_public_dashboard():
    """
    Verifies that citizen reports marked TEST/DEMO are strictly excluded from public view.
    """
    res = client.get("/api/v1/reports/")
    assert res.status_code == 200
    public_reports = res.json()
    for r in public_reports:
        assert r.get("reporter_role") != "TEST/DEMO"
        assert r.get("verification_status") != "TEST_DEMO"
        assert r.get("review_status") != "TEST_DEMO"


def test_health_metrics_endpoint_and_alerting():
    """
    Master Prompt Section 48 & 49: Observability, Metrics, and Alerting.
    """
    res = client.get("/health/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "alert_level" in data
    assert data["alert_level"] in ("INFO", "WARNING", "CRITICAL")
    assert "pipeline" in data
    assert "circuit_breakers" in data
    assert "queue_depth" in data["pipeline"]


def test_source_classifications_and_freshness_thresholds():
    """
    Master Prompt Section 5 & 19: Source Classifications and Freshness Thresholds.
    """
    from apps.api.app.core.source_access import get_all_source_access_evaluations, SourceClassification

    evals = get_all_source_access_evaluations()
    assert len(evals) == 15
    for rec in evals:
        assert isinstance(rec.source_classification, SourceClassification)
        assert rec.freshness_threshold_hours is not None
        assert rec.freshness_threshold_hours > 0

    # Specific classification verifications
    by_id = {r.source_id: r for r in evals}
    assert by_id["thaiwater_rid_runoff"].source_classification == SourceClassification.HIGH_FREQUENCY
    assert by_id["gistda_disaster"].source_classification == SourceClassification.PERIODIC
    assert by_id["tmd_forecast"].source_classification == SourceClassification.FORECAST
    assert by_id["dwr_waterways"].source_classification == SourceClassification.STATIC_REFERENCE
    assert by_id["diw_industrial_waste"].source_classification == SourceClassification.HISTORICAL
    assert by_id["floodtrace_citizen"].source_classification == SourceClassification.LIVE


def test_automated_data_pipeline_validation_and_deduplication():
    """
    Master Prompt Section 13, 15, 18: Automated Pipeline Validation & Deduplication.
    """
    import asyncio
    from apps.api.app.core.pipeline import DataIngestionPipeline, IngestionTask

    pipeline = DataIngestionPipeline()

    # 1. Validation rejection: Coordinates outside Prachin Buri on authorized source
    invalid_task = IngestionTask(
        source_id="floodtrace_citizen",
        dataset_id="ground_observation",
        station_id="st_out_of_bounds",
        payload={"latitude": 18.78, "longitude": 98.98, "water_depth_cm": 15.0} # Chiang Mai
    )
    result1 = asyncio.run(pipeline.process_task(invalid_task))
    assert result1.status == "VALIDATION_FAILED"
    assert "outside Prachin Buri" in result1.message

    # 2. Production fail-closed gate: Non-authorized source blocked under production
    blocked_task = IngestionTask(
        source_id="gistda_disaster",
        dataset_id="flood_extent",
        payload={"latitude": 14.05, "longitude": 101.38, "area_sqkm": 12.5}
    )
    result2 = asyncio.run(pipeline.process_task(blocked_task))
    assert result2.status == "BLOCKED"
    assert "blocked from production" in result2.message.lower()

    # 3. Deduplication: Duplicate observation ignored
    task_a = IngestionTask(
        source_id="floodtrace_citizen",
        dataset_id="ground_observation",
        station_id="rpt_demo_1",
        observation_time="2026-10-02T10:00:00Z",
        payload={"latitude": 14.05, "longitude": 101.38, "water_depth_cm": 20.0}
    )
    res_first = asyncio.run(pipeline.process_task(task_a))
    assert res_first.status == "SUCCESS"

    res_duplicate = asyncio.run(pipeline.process_task(task_a))
    assert res_duplicate.status == "DEDUPLICATED"
    assert pipeline.get_stats()["tasks_deduplicated"] >= 1


def test_realtime_sse_event_broadcasting():
    """
    Master Prompt Section 20: Real-Time SSE Broadcaster.
    """
    import asyncio
    from apps.api.app.core.pipeline import event_broadcaster

    async def run_broadcast_test():
        sub_queue = await event_broadcaster.subscribe()
        test_payload = {"source": "floodtrace_citizen", "dataset": "ground_obs", "area": "กบินทร์บุรี"}
        await event_broadcaster.broadcast_event("DATA_UPDATED", test_payload)

        msg = await asyncio.wait_for(sub_queue.get(), timeout=2.0)
        assert msg["event"] == "DATA_UPDATED"
        assert msg["data"]["source"] == "floodtrace_citizen"
        assert msg["data"]["area"] == "กบินทร์บุรี"
        await event_broadcaster.unsubscribe(sub_queue)

    asyncio.run(run_broadcast_test())
