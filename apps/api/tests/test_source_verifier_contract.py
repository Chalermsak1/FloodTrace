import json
import os
import shlex
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from scripts.verify_all_sources import (
    EXIT_EXPECTED_LIMITATIONS,
    EXIT_VERIFICATION_FAILURE,
    EXIT_VERIFIED,
    classify_public_limitation,
    classify_source,
    public_provenance_reconciles,
    verifier_exit_code,
)


ROOT = Path(__file__).resolve().parents[3]


def _valid_active_evidence(now=None):
    now = now or datetime.now(timezone.utc)
    started = now - timedelta(seconds=3)
    finished = now - timedelta(seconds=1)
    source = {
        "source_id": "thaiwater_rid_runoff",
        "source_status": "ACTIVE API",
        "runtime_status": "AVAILABLE",
        "SOURCE_EXISTS": True,
        "ENDPOINT_VERIFIED": True,
        "ACCESS_VERIFIED": True,
        "LICENSE_VERIFIED": True,
        "PUBLIC_API_AVAILABLE": True,
        "DATABASE_INGESTED": True,
        "FRESHNESS_VERIFIED": True,
        "REAL_EXTERNAL_REQUEST": True,
        "REAL_DATA_RECEIVED": True,
        "production_allowed": True,
        "production_eligible": True,
        "verified_license": True,
        "PRODUCTION_ENABLED": True,
        "database_records": 3,
        "latest_source_timestamp": (now - timedelta(seconds=20)).isoformat(),
        "freshness_status": "CURRENT",
        "AUTOMATED_REFRESH": True,
    }
    scheduler_source = {
        "automated_refresh": True,
        "disabled": False,
        "http_status": 200,
        "last_error": None,
        "request_started_at": started.isoformat(),
        "request_finished_at": finished.isoformat(),
        "interval_seconds": 900,
        "records_received_last_run": 3,
        "measurements_received_last_run": 2,
        "consecutive_failures": 0,
        "circuit_breaker_status": "CLOSED",
    }
    return source, scheduler_source, now


def _health_payload(records):
    production_counts = {
        "TOTAL_EXTERNAL_SOURCES": len(records),
        "REAL_EXTERNAL_API_SOURCES": sum(row.get("source_status") == "ACTIVE API" for row in records.values()),
        "AUTOMATED_PRODUCTION_SOURCES": sum(row.get("AUTOMATED_REFRESH") is True for row in records.values()),
        "PRODUCTION_REFERENCE_SOURCES": sum(row.get("source_status") == "LOCAL / VERIFIED REFERENCE" for row in records.values()),
        "LOCAL_ONLY_SOURCES": sum(row.get("source_status") == "LOCAL / UNVERIFIED" for row in records.values()),
        "BLOCKED_SOURCES": sum(row.get("source_status") == "BLOCKED" for row in records.values()),
        "TEST_ONLY_SOURCES": sum(row.get("source_status") == "INTERNAL" for row in records.values()),
    }
    return {
        "sources": records,
        "production_counts": production_counts,
        "total_sources_evaluated": len(records),
    }


def _fixture_payloads(scenario):
    source, scheduler_source, now = _valid_active_evidence()
    if scenario in {"expected_limitations", "mixed_failure", "malformed_scheduler"}:
        records = {
            "gistda_disaster": {"source_status": "BLOCKED", "AUTOMATED_REFRESH": False},
        }
        statuses = {"gistda_disaster": "BLOCKED"}
        if scenario == "expected_limitations":
            records["pcd_water_quality"] = {"source_status": "UNAVAILABLE / UNVERIFIED", "AUTOMATED_REFRESH": False}
            statuses["pcd_water_quality"] = "UNAVAILABLE / UNVERIFIED"
        else:
            if scenario == "mixed_failure":
                source["REAL_EXTERNAL_REQUEST"] = False
            records[source["source_id"]] = source
            statuses[source["source_id"]] = source["source_status"]
    else:
        if scenario == "failure":
            source["REAL_EXTERNAL_REQUEST"] = False
        records = {source["source_id"]: source}
        statuses = {source["source_id"]: source["source_status"]}

    scheduler_sources = {source["source_id"]: scheduler_source} if source["source_id"] in records else {}
    if scenario == "malformed_scheduler":
        scheduler_sources = ["malformed"]
    elif scenario == "malformed_nested_scheduler":
        scheduler_sources[source["source_id"]] = ["malformed"]
    provenance_rows = [
        {"source_id": source_id, "source_status": status}
        for source_id, status in statuses.items()
    ]
    if scenario == "expected_limitations":
        provenance_rows.append({"source_id": "rid_reservoirs", "source_status": "ACCESS REQUIRED"})
    scheduler_payload = {"scheduler_active": True, "sources": scheduler_sources}
    return {
        "/health/sources": _health_payload(records),
        "/api/public/provenance": {"sources": provenance_rows},
        "/health/metrics": {"status": "healthy", "pipeline": {}},
        "/api/v1/admin/scheduler/status": scheduler_payload,
    }


def _run_entrypoint(entrypoint, payloads, tmp_path):
    harness = tmp_path / "run_verifier_with_fixture.py"
    harness.write_text("""import json, runpy, sys, urllib.parse, urllib.request
fixture = json.loads(__import__('os').environ['RUWAIGON_TEST_FIXTURE'])
class Response:
    status = 200
    def __init__(self, payload): self.payload = payload
    def __enter__(self): return self
    def __exit__(self, *_args): return False
    def read(self): return json.dumps(self.payload).encode()
def fixture_open(request, timeout=8):
    path = urllib.parse.urlsplit(request.full_url).path
    return Response(fixture[path])
urllib.request.urlopen = fixture_open
target = sys.argv[1]
sys.argv = [target]
runpy.run_path(target, run_name='__main__')
""")
    shim_dir = tmp_path / "bin"
    shim_dir.mkdir()
    python_shim = shim_dir / "python3"
    python_shim.write_text(f"#!/bin/sh\nexec {shlex.quote(sys.executable)} {shlex.quote(str(harness))} \"$@\"\n")
    python_shim.chmod(0o755)

    env = os.environ.copy()
    env["RUWAIGON_API_URL"] = "http://isolated-fixture.invalid"
    env["RUWAIGON_ADMIN_KEY"] = "fixture-only"
    env["RUWAIGON_TEST_FIXTURE"] = json.dumps(payloads)
    env["PATH"] = os.pathsep.join((str(shim_dir), env.get("PATH", "")))
    script = str(ROOT / "scripts/verify_all_sources.py")
    if entrypoint == "python-script":
        command = [sys.executable, str(harness), script]
    else:
        command = ["bash", str(ROOT / "deploy/production/verify.sh")]
    return subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, timeout=20)


def test_current_active_api_evidence_verifies():
    source, scheduler_source, now = _valid_active_evidence()
    assert classify_source(source, scheduler_source, scheduler_active=True, now=now) == "VERIFIED"


@pytest.mark.parametrize("defect", [
    "inactive_runtime",
    "expired_request",
    "failed_request",
    "no_real_data",
    "no_usable_measurement",
    "malformed_runtime_evidence",
])
def test_active_api_persisted_records_never_replace_invalid_current_evidence(defect):
    source, runtime, now = _valid_active_evidence()
    source["database_records"] = 15  # Historical rows remain present in every negative case.
    if defect == "inactive_runtime":
        source["runtime_status"] = "INACTIVE"
        source["REAL_EXTERNAL_REQUEST"] = False
        result = classify_source(source, runtime, scheduler_active=False, now=now)
    elif defect == "expired_request":
        runtime["request_started_at"] = (now - timedelta(seconds=1000)).isoformat()
        runtime["request_finished_at"] = (now - timedelta(seconds=999)).isoformat()
        result = classify_source(source, runtime, scheduler_active=True, now=now)
    elif defect == "failed_request":
        runtime["http_status"] = 503
        runtime["last_error"] = "upstream failure"
        result = classify_source(source, runtime, scheduler_active=True, now=now)
    elif defect == "no_real_data":
        source["REAL_DATA_RECEIVED"] = False
        result = classify_source(source, runtime, scheduler_active=True, now=now)
    elif defect == "malformed_runtime_evidence":
        runtime["runtime_status"] = []
        result = classify_source(source, runtime, scheduler_active=True, now=now)
    else:
        runtime["measurements_received_last_run"] = 0
        result = classify_source(source, runtime, scheduler_active=True, now=now)
    assert result == "PARTIAL"
    assert result != "VERIFIED"


@pytest.mark.parametrize(("states", "expected"), [
    (["VERIFIED", "VERIFIED"], EXIT_VERIFIED),
    (["VERIFIED", "BLOCKED", "UNAVAILABLE"], EXIT_EXPECTED_LIMITATIONS),
    (["PARTIAL"], EXIT_VERIFICATION_FAILURE),
    (["BLOCKED", "PARTIAL"], EXIT_VERIFICATION_FAILURE),
])
def test_exit_contract_and_failure_precedence(states, expected):
    assert verifier_exit_code(states) == expected


def test_access_required_provenance_is_an_expected_limitation():
    assert classify_public_limitation({"source_status": "ACCESS REQUIRED"}) == "BLOCKED"
    assert classify_public_limitation({"source_status": []}) is None
    assert not public_provenance_reconciles({"sources": [{"source_status": []}]})
    assert classify_source({"source_status": []}) == "PARTIAL"
    assert verifier_exit_code([[]]) == EXIT_VERIFICATION_FAILURE


@pytest.mark.parametrize("entrypoint", ["python-script", "deployment-wrapper"])
@pytest.mark.parametrize(("scenario", "expected"), [
    ("all_valid", EXIT_VERIFIED),
    ("expected_limitations", EXIT_EXPECTED_LIMITATIONS),
    ("failure", EXIT_VERIFICATION_FAILURE),
    ("mixed_failure", EXIT_VERIFICATION_FAILURE),
    ("malformed_scheduler", EXIT_VERIFICATION_FAILURE),
    ("malformed_nested_scheduler", EXIT_VERIFICATION_FAILURE),
])
def test_both_verifier_entrypoints_share_exit_semantics(entrypoint, scenario, expected, tmp_path):
    result = _run_entrypoint(entrypoint, _fixture_payloads(scenario), tmp_path)
    assert result.returncode == expected, result.stdout + result.stderr
    assert "Traceback" not in result.stderr
    if scenario in {"malformed_scheduler", "malformed_nested_scheduler"}:
        assert "SCHEDULER: PARTIAL" in result.stdout
