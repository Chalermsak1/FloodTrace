"""Evidence-backed runtime status helpers for source health responses."""

from datetime import datetime, timezone
from typing import Any, Optional


def has_current_external_request_evidence(source_status: str, scheduler_source: Any, now: Optional[datetime] = None) -> bool:
    """Require a recent HTTP 200 recorded by the adapter, not just an ACTIVE API label."""
    now = now or datetime.now(timezone.utc)
    if source_status != "ACTIVE API" or not isinstance(scheduler_source, dict):
        return False
    started_raw = scheduler_source.get("request_started_at")
    finished_raw = scheduler_source.get("request_finished_at")
    http_status = scheduler_source.get("http_status")
    interval = scheduler_source.get("interval_seconds")
    if (
        not isinstance(started_raw, str)
        or not isinstance(finished_raw, str)
        or isinstance(http_status, bool)
        or http_status != 200
        or isinstance(interval, bool)
        or not isinstance(interval, (int, float))
        or interval <= 0
    ):
        return False
    try:
        started = datetime.fromisoformat(started_raw.replace("Z", "+00:00"))
        finished = datetime.fromisoformat(finished_raw.replace("Z", "+00:00"))
    except ValueError:
        return False
    if started.tzinfo is None or finished.tzinfo is None or now.tzinfo is None:
        return False
    started = started.astimezone(timezone.utc)
    finished = finished.astimezone(timezone.utc)
    now = now.astimezone(timezone.utc)
    age_seconds = (now - finished).total_seconds()
    return started <= finished <= now and 0 <= age_seconds <= interval


def model_runtime_status(health: Any, now: Optional[datetime] = None, max_age_seconds: int = 300) -> str:
    """A model is available only after a recent HTTP 200 with usable forecast days."""
    if not isinstance(health, dict):
        return "UNAVAILABLE"
    finished_raw = health.get("request_finished_at")
    try:
        finished = datetime.fromisoformat(finished_raw.replace("Z", "+00:00")) if isinstance(finished_raw, str) else None
    except ValueError:
        finished = None
    now = now or datetime.now(timezone.utc)
    age = None
    if finished is not None and finished.tzinfo is not None and now.tzinfo is not None:
        age = (now.astimezone(timezone.utc) - finished.astimezone(timezone.utc)).total_seconds()
    usable_days = health.get("usable_days")
    if (
        health.get("http_status") == 200
        and isinstance(usable_days, int)
        and not isinstance(usable_days, bool)
        and usable_days > 0
        and age is not None
        and 0 <= age <= max_age_seconds
        and health.get("last_error") is None
    ):
        return "AVAILABLE MODEL"
    if health.get("last_error"):
        return "UPSTREAM ERROR"
    return "UNAVAILABLE"


def telemetry_runtime_status(
    current_request: bool,
    scheduler_source: Any,
    scheduler_active: bool,
    has_measurements: bool,
    freshness_verified: bool,
) -> str:
    """Describe the last supported telemetry run without equating code presence with health."""
    if current_request:
        return "AVAILABLE" if has_measurements and freshness_verified else "PARTIAL"
    if isinstance(scheduler_source, dict):
        error = scheduler_source.get("last_error")
        if isinstance(error, str) and error:
            return "ACCESS REQUIRED" if "blocked" in error.lower() else "UPSTREAM ERROR"
    if not scheduler_active:
        return "INACTIVE"
    if not scheduler_source:
        return "NOT CHECKED"
    return "UNVERIFIED"
