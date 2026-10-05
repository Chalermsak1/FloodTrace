#!/usr/bin/env python3
"""Verify source status from Ruwaigon application evidence contracts."""
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE_URL = os.environ.get("RUWAIGON_API_URL", os.environ.get("FLOODTRACE_API_URL", "http://127.0.0.1:8001")).rstrip("/")
RESULTS = {"VERIFIED", "UNAVAILABLE", "BLOCKED", "UNVERIFIED", "PARTIAL"}
# Process exits: 0 = verified, 1 = expected limitations, 2 = verification failure.
EXIT_VERIFIED = 0
EXIT_EXPECTED_LIMITATIONS = 1
EXIT_VERIFICATION_FAILURE = 2
EXPECTED_LIMITATION_STATES = {"UNAVAILABLE", "BLOCKED", "UNVERIFIED"}
PUBLIC_SOURCE_STATES = {
    "ACTIVE API",
    "AVAILABLE MODEL",
    "ACCESS REQUIRED",
    "LOCAL / VERIFIED REFERENCE",
    "LOCAL / UNVERIFIED",
    "INTERNAL",
    "BLOCKED",
    "UNAVAILABLE / UNVERIFIED",
}


def fetch(path, headers=None):
    request = urllib.request.Request(f"{BASE_URL}{path}", headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.loads(response.read()), response.status
    except urllib.error.HTTPError as error:
        return None, error.code
    except (OSError, ValueError, urllib.error.URLError):
        return None, None


def _parse_timestamp(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(timezone.utc) if parsed.tzinfo is not None else None


def classify_source(record, scheduler_source=None, scheduler_active=None, now=None):
    if not isinstance(record, dict):
        return "PARTIAL"
    status = record.get("source_status")
    if status is None:
        return "UNVERIFIED"
    if not isinstance(status, str):
        return "PARTIAL"
    if status == "BLOCKED":
        return "BLOCKED"
    if status == "UNAVAILABLE / UNVERIFIED":
        return "UNAVAILABLE"
    if status in {"LOCAL / UNVERIFIED", "INTERNAL"}:
        return "UNVERIFIED"
    if status == "ACTIVE API":
        now = now or datetime.now(timezone.utc)
        scheduler_source = scheduler_source if isinstance(scheduler_source, dict) else {}
        started = _parse_timestamp(scheduler_source.get("request_started_at"))
        finished = _parse_timestamp(scheduler_source.get("request_finished_at"))
        interval = scheduler_source.get("interval_seconds")
        request_age = (now.astimezone(timezone.utc) - finished).total_seconds() if finished and now.tzinfo else None
        source_timestamp = _parse_timestamp(record.get("latest_source_timestamp"))
        database_records = record.get("database_records")
        received_records = scheduler_source.get("records_received_last_run")
        received_measurements = scheduler_source.get("measurements_received_last_run")
        consecutive_failures = scheduler_source.get("consecutive_failures")
        runtime_state = scheduler_source.get("runtime_status", scheduler_source.get("status"))
        disabled_runtime_states = {"INACTIVE", "FAILED", "ERROR", "BLOCKED", "DISABLED", "STALE"}
        runtime_state_eligible = (
            runtime_state is None
            or isinstance(runtime_state, str) and runtime_state not in disabled_runtime_states
        )
        good_evidence = (
            scheduler_active is True
            and record.get("runtime_status") == "AVAILABLE"
            and all(record.get(key) is True for key in (
                "SOURCE_EXISTS", "ENDPOINT_VERIFIED", "ACCESS_VERIFIED", "LICENSE_VERIFIED",
                "PUBLIC_API_AVAILABLE", "DATABASE_INGESTED", "FRESHNESS_VERIFIED",
                "REAL_EXTERNAL_REQUEST", "REAL_DATA_RECEIVED", "production_allowed",
                "production_eligible", "verified_license", "PRODUCTION_ENABLED",
            ))
            and isinstance(database_records, int) and not isinstance(database_records, bool) and database_records > 0
            and record.get("freshness_status") == "CURRENT"
            and source_timestamp is not None and now.tzinfo is not None and source_timestamp <= now.astimezone(timezone.utc)
            and scheduler_source.get("automated_refresh") is True
            and scheduler_source.get("disabled") is not True
            and scheduler_source.get("is_active") is not False
            and runtime_state_eligible
            and scheduler_source.get("http_status") == 200
            and not isinstance(scheduler_source.get("http_status"), bool)
            and "last_error" in scheduler_source
            and scheduler_source.get("last_error") in (None, "")
            and isinstance(interval, (int, float)) and not isinstance(interval, bool) and interval > 0
            and started is not None and finished is not None and started <= finished
            and finished <= now.astimezone(timezone.utc) and request_age is not None
            and 0 <= request_age <= interval
            and isinstance(received_records, int) and not isinstance(received_records, bool) and received_records > 0
            and isinstance(received_measurements, int) and not isinstance(received_measurements, bool) and received_measurements > 0
            and consecutive_failures == 0 and not isinstance(consecutive_failures, bool)
            and scheduler_source.get("circuit_breaker_status") == "CLOSED"
        )
        if good_evidence:
            return "VERIFIED"
        return "PARTIAL"
    return "UNVERIFIED"


def classify_public_limitation(row):
    """Map valid public provenance limitations into the existing five-state vocabulary."""
    if not isinstance(row, dict):
        return None
    status = row.get("source_status")
    if not isinstance(status, str):
        return None
    if status in {"BLOCKED", "ACCESS REQUIRED"}:
        return "BLOCKED"
    if status == "UNAVAILABLE / UNVERIFIED":
        return "UNAVAILABLE"
    if status in {"LOCAL / UNVERIFIED", "INTERNAL"}:
        return "UNVERIFIED"
    return None


def verifier_exit_code(states):
    """Return 0 verified, 1 expected limitations, or 2 contract/verification failure."""
    if (not isinstance(states, list) or not states
            or any(not isinstance(state, str) or state not in RESULTS for state in states)):
        return EXIT_VERIFICATION_FAILURE
    if "PARTIAL" in states:
        return EXIT_VERIFICATION_FAILURE
    if any(state in EXPECTED_LIMITATION_STATES for state in states):
        return EXIT_EXPECTED_LIMITATIONS
    if all(state == "VERIFIED" for state in states):
        return EXIT_VERIFIED
    return EXIT_VERIFICATION_FAILURE


def source_health_reconciles(payload):
    records = payload.get("sources") if isinstance(payload, dict) else None
    totals = payload.get("production_counts") if isinstance(payload, dict) else None
    if not isinstance(records, dict) or not isinstance(totals, dict):
        return False
    expected = {
        "TOTAL_EXTERNAL_SOURCES": len(records),
        "REAL_EXTERNAL_API_SOURCES": sum(item.get("source_status") == "ACTIVE API" for item in records.values() if isinstance(item, dict)),
        "AUTOMATED_PRODUCTION_SOURCES": sum(item.get("AUTOMATED_REFRESH") is True for item in records.values() if isinstance(item, dict)),
        "PRODUCTION_REFERENCE_SOURCES": sum(item.get("source_status") == "LOCAL / VERIFIED REFERENCE" for item in records.values() if isinstance(item, dict)),
        "LOCAL_ONLY_SOURCES": sum(item.get("source_status") == "LOCAL / UNVERIFIED" for item in records.values() if isinstance(item, dict)),
        "BLOCKED_SOURCES": sum(item.get("source_status") == "BLOCKED" for item in records.values() if isinstance(item, dict)),
        "TEST_ONLY_SOURCES": sum(item.get("source_status") == "INTERNAL" for item in records.values() if isinstance(item, dict)),
    }
    return all(totals.get(key) == value for key, value in expected.items()) and all(isinstance(item, dict) for item in records.values())


def public_provenance_reconciles(payload):
    rows = payload.get("sources") if isinstance(payload, dict) else None
    return isinstance(rows, list) and all(
        isinstance(row, dict) and isinstance(row.get("source_status"), str)
        and row.get("source_status") in PUBLIC_SOURCE_STATES
        for row in rows
    )


def classify_scheduler(payload):
    if not isinstance(payload, dict):
        return "PARTIAL"
    if payload.get("scheduler_active") is False:
        return "BLOCKED"
    if (payload.get("scheduler_active") is not True or not isinstance(payload.get("sources"), dict)
            or any(not isinstance(item, dict) for item in payload["sources"].values())):
        return "PARTIAL"
    return "VERIFIED"


def main():
    sources, source_http = fetch("/health/sources")
    provenance, provenance_http = fetch("/api/public/provenance")
    metrics, metrics_http = fetch("/health/metrics")
    admin_key = os.environ.get("RUWAIGON_ADMIN_KEY")
    scheduler, scheduler_http = fetch("/api/v1/admin/scheduler/status", {"X-Admin-Key": admin_key} if admin_key else {})

    contracts = {
        "SOURCE_HEALTH": (sources, source_http),
        "PUBLIC_PROVENANCE": (provenance, provenance_http),
        "METRICS": (metrics, metrics_http),
        "SCHEDULER": (scheduler, scheduler_http),
    }
    states = []
    for name, (payload, code) in contracts.items():
        valid = isinstance(payload, dict) and code == 200
        if not valid:
            # Required application contracts must be reachable and well formed;
            # source-level unavailability is represented inside a valid payload.
            state = "PARTIAL"
        elif name == "SOURCE_HEALTH":
            records = payload.get("sources")
            totals = payload.get("production_counts")
            if (not source_health_reconciles(payload)
                    or payload.get("total_sources_evaluated") != len(records)):
                state = "PARTIAL"
            else:
                runtime = scheduler.get("sources") if isinstance(scheduler, dict) else None
                if not isinstance(runtime, dict):
                    runtime = {}
                scheduler_active = scheduler.get("scheduler_active") if isinstance(scheduler, dict) else None
                classifications = [
                    classify_source(record, runtime.get(key), scheduler_active)
                    for key, record in records.items()
                ]
                state = "PARTIAL" if "PARTIAL" in classifications else "VERIFIED"
        elif name == "PUBLIC_PROVENANCE":
            state = "VERIFIED" if public_provenance_reconciles(payload) else "PARTIAL"
        elif name == "METRICS":
            state = "VERIFIED" if payload.get("status") in {"healthy", "degraded"} and isinstance(payload.get("pipeline"), dict) else "PARTIAL"
        else:
            state = classify_scheduler(payload)
        states.append(state)
        print(f"{name}: {state}")

    runtime_sources = scheduler.get("sources") if isinstance(scheduler, dict) and isinstance(scheduler.get("sources"), dict) else {}
    scheduler_active = scheduler.get("scheduler_active") if isinstance(scheduler, dict) else None
    if isinstance(sources, dict) and isinstance(sources.get("sources"), dict):
        prov_rows = {row.get("source_id"): row for row in provenance.get("sources", []) if isinstance(row, dict)} if isinstance(provenance, dict) else {}
        for key, record in sources["sources"].items():
            state = classify_source(record, runtime_sources.get(key), scheduler_active)
            public_row = prov_rows.get(key)
            if not public_row or public_row.get("source_status") != record.get("source_status"):
                state = "PARTIAL"
            print(f"{key}: {state}")
            states.append(state)

    if isinstance(provenance, dict) and isinstance(provenance.get("sources"), list):
        for row in provenance["sources"]:
            limitation = classify_public_limitation(row)
            if limitation:
                print(f"{row.get('source_id', 'PUBLIC_SOURCE')}: {limitation}")
                states.append(limitation)

    return verifier_exit_code(states)


if __name__ == "__main__":
    raise SystemExit(main())
