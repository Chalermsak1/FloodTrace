"""
FloodTrace Timezone Regression Protection Suite
Master Prompt Section 15: Permanent tests verifying that Thai timestamps
(Asia/Bangkok) remain strictly correct, normalized, and unambiguous (+07:00).
"""

import pytest
from datetime import datetime, timezone
import zoneinfo
from apps.api.app.core.datetime_utils import (
    parse_thai_datetime,
    to_bangkok_iso,
    to_utc_datetime,
    format_thai_display
)
from apps.api.app.models.entities import WaterLevelObservation

def test_asia_bangkok_parsing_and_utc_conversion():
    """
    Verifies that naive Thai datetime strings (e.g. 2026-10-03 18:30)
    are parsed as Asia/Bangkok and correctly converted to UTC without distortion.
    """
    raw_str = "2026-10-03 18:30:00"
    dt_bkk = parse_thai_datetime(raw_str)
    
    assert dt_bkk.tzinfo is not None
    assert str(dt_bkk.tzinfo) == "Asia/Bangkok" or dt_bkk.utcoffset().total_seconds() == 7 * 3600
    assert dt_bkk.hour == 18
    assert dt_bkk.minute == 30

    dt_utc = to_utc_datetime(dt_bkk)
    assert dt_utc.tzinfo == timezone.utc
    # 18:30 in Bangkok is 11:30 in UTC
    assert dt_utc.hour == 11
    assert dt_utc.minute == 30


def test_api_serialization_explicit_offset():
    """
    Verifies that API serialization produces unambiguous +07:00 offsets.
    """
    dt_utc = datetime(2026, 10, 3, 11, 30, 0, tzinfo=timezone.utc)
    iso_bkk = to_bangkok_iso(dt_utc)
    
    assert "+07:00" in iso_bkk
    assert "2026-10-03T18:30:00+07:00" == iso_bkk


def test_day_and_date_rollover_safety():
    """
    Verifies rollover across midnight: 23:30 UTC is 06:30 next day in Bangkok.
    """
    dt_utc = datetime(2026, 10, 3, 23, 30, 0, tzinfo=timezone.utc)
    dt_bkk = dt_utc.astimezone(zoneinfo.ZoneInfo("Asia/Bangkok"))
    
    assert dt_bkk.day == 4
    assert dt_bkk.month == 10
    assert dt_bkk.year == 2026
    assert dt_bkk.hour == 6
    assert dt_bkk.minute == 30


def test_thai_display_formatting():
    """
    Verifies human-readable Thai Buddhist Era (พ.ศ.) formatting.
    2026 + 543 = 2569
    """
    dt_utc = datetime(2026, 10, 3, 11, 30, 0, tzinfo=timezone.utc)
    formatted = format_thai_display(dt_utc)
    
    assert "2569" in formatted
    assert "ต.ค." in formatted
    assert "18:30" in formatted


from fastapi.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

def test_no_timezone_naive_in_public_overview():
    """
    Verifies public API response does not expose timezone-naive timestamps.
    """
    res = client.get("/api/public/overview")
    assert res.status_code == 200
    data = res.json()
    
    iso_ts = data.get("system_updated_at_iso")
    assert iso_ts is not None
    assert "+07:00" in iso_ts or iso_ts.endswith("Z")
