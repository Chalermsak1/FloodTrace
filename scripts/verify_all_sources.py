#!/usr/bin/env python3
"""Verify source status from Ruwaigon application evidence contracts."""
import json
import os
import urllib.error
import urllib.request

BASE_URL = os.environ.get("RUWAIGON_API_URL", os.environ.get("FLOODTRACE_API_URL", "http://127.0.0.1:8001")).rstrip("/")
RESULTS = {"VERIFIED", "UNAVAILABLE", "BLOCKED", "UNVERIFIED", "PARTIAL"}


def fetch(path, headers=None):
    request = urllib.request.Request(f"{BASE_URL}{path}", headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.loads(response.read()), response.status
    except (OSError, ValueError, urllib.error.URLError):
        return None, None


def classify_source(record):
    if not isinstance(record, dict):
        return "PARTIAL"
    status = record.get("source_status")
    if status == "BLOCKED":
        return "BLOCKED"
    if status == "UNAVAILABLE / UNVERIFIED":
        return "UNAVAILABLE"
    if status in {"LOCAL / UNVERIFIED", "INTERNAL"}:
        return "UNVERIFIED"
    if status == "ACTIVE API":
        if (record.get("SOURCE_EXISTS") is True and record.get("ENDPOINT_VERIFIED") is True
                and record.get("LICENSE_VERIFIED") is True and record.get("PUBLIC_API_AVAILABLE") is True
                and record.get("DATABASE_INGESTED") is True and record.get("FRESHNESS_VERIFIED") is True
                and isinstance(record.get("database_records"), int) and record["database_records"] > 0
                and record.get("latest_source_timestamp")):
            return "VERIFIED"
        return "PARTIAL"
    return "UNVERIFIED"


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


def classify_scheduler(payload):
    if not isinstance(payload, dict):
        return "PARTIAL"
    if payload.get("scheduler_active") is False:
        return "BLOCKED"
    if payload.get("scheduler_active") is not True or not isinstance(payload.get("sources"), dict):
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
            state = "UNAVAILABLE" if payload is None else "PARTIAL"
        elif name == "SOURCE_HEALTH":
            records = payload.get("sources")
            totals = payload.get("production_counts")
            if (not source_health_reconciles(payload)
                    or payload.get("total_sources_evaluated") != len(records)):
                state = "PARTIAL"
            else:
                classifications = [classify_source(record) for record in records.values()]
                state = "PARTIAL" if "PARTIAL" in classifications else "VERIFIED"
        elif name == "PUBLIC_PROVENANCE":
            rows = payload.get("sources")
            state = "VERIFIED" if isinstance(rows, list) and all(isinstance(row, dict) and row.get("source_status") in {"ACTIVE API", "LOCAL / VERIFIED REFERENCE", "LOCAL / UNVERIFIED", "INTERNAL", "BLOCKED", "UNAVAILABLE / UNVERIFIED"} for row in rows) else "PARTIAL"
        elif name == "METRICS":
            state = "VERIFIED" if payload.get("status") in {"healthy", "degraded"} and isinstance(payload.get("pipeline"), dict) else "PARTIAL"
        else:
            state = classify_scheduler(payload)
        states.append(state)
        print(f"{name}: {state}")

    if isinstance(sources, dict) and isinstance(sources.get("sources"), dict):
        prov_rows = {row.get("source_id"): row for row in provenance.get("sources", []) if isinstance(row, dict)} if isinstance(provenance, dict) else {}
        for key, record in sources["sources"].items():
            state = classify_source(record)
            public_row = prov_rows.get(key)
            if not public_row or public_row.get("source_status") != record.get("source_status"):
                state = "PARTIAL"
            print(f"{key}: {state}")
            states.append(state)

    if any(state in {"PARTIAL", "BLOCKED", "UNVERIFIED"} for state in states):
        return 2
    if any(state == "UNAVAILABLE" for state in states):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
