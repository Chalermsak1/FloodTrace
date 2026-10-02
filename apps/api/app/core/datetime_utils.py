from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from zoneinfo import ZoneInfo
import logging

logger = logging.getLogger("floodtrace.datetime_utils")

# Thailand Standard Time is UTC+07:00 (no daylight saving time)
BANGKOK_TZ = ZoneInfo("Asia/Bangkok")
CLOCK_SKEW_TOLERANCE_SECONDS = 300.0  # 5 minutes acceptable tolerance for gateway clock drift

class FutureTimestampError(ValueError):
    """Raised when an observational physical sensor timestamp is in the future."""
    pass

def parse_thaiwater_timestamp(
    raw_val: Optional[Any],
    allow_future: bool = False
) -> Dict[str, Any]:
    """
    Master Prompt Timestamp & Timezone Integrity Standard:
    Parses and normalizes raw timestamps from ThaiWater (Hydroinformatics Institute - HII).
    
    Raw ThaiWater timestamps:
    - Example: "2026-10-02 20:40" or "2026-10-02 20:00:00"
    - Semantics: Timezone-naive string representing official Thailand Local Time (Asia/Bangkok, UTC+07:00).
    - Rule: Must be interpreted as Asia/Bangkok, then converted to UTC.
    - Rule: SOURCE_TIMESTAMP_MUST_NOT_BE_IN_FUTURE (rejects future observation timestamps).
    """
    if raw_val is None:
        raise ValueError("Timestamp value cannot be None")

    if isinstance(raw_val, datetime):
        if raw_val.tzinfo is None:
            # Naive datetime from ThaiWater source represents Asia/Bangkok
            dt_bkk = raw_val.replace(tzinfo=BANGKOK_TZ)
        else:
            # Timezone-aware: convert to Asia/Bangkok
            dt_bkk = raw_val.astimezone(BANGKOK_TZ)
    elif isinstance(raw_val, str):
        cleaned = raw_val.strip()
        if not cleaned:
            raise ValueError("Timestamp string cannot be empty")
        
        # Replace space with T if needed, or handle standard formats
        # "2026-10-02 20:40" -> fromisoformat handles "2026-10-02 20:40"
        try:
            # If string already has Z, it was erroneously pre-tagged; remove Z to inspect naive time
            clean_str = cleaned.replace("Z", "").replace("+00:00", "")
            if "+" in clean_str:
                dt_parsed = datetime.fromisoformat(cleaned)
                dt_bkk = dt_parsed.astimezone(BANGKOK_TZ)
            else:
                dt_naive = datetime.fromisoformat(clean_str)
                dt_bkk = dt_naive.replace(tzinfo=BANGKOK_TZ)
        except Exception as e:
            raise ValueError(f"Unable to parse timestamp '{raw_val}': {e}")
    else:
        raise ValueError(f"Unsupported timestamp type: {type(raw_val)}")

    dt_utc = dt_bkk.astimezone(timezone.utc)
    now_utc = datetime.now(timezone.utc)
    delta_seconds = (dt_utc - now_utc).total_seconds()
    age_seconds = -delta_seconds  # Positive when in past

    # Enforce Validation Rule: SOURCE_TIMESTAMP_MUST_NOT_BE_IN_FUTURE
    if not allow_future and delta_seconds > CLOCK_SKEW_TOLERANCE_SECONDS:
        msg = (
            f"SOURCE_TIMESTAMP_MUST_NOT_BE_IN_FUTURE violation: "
            f"Observation timestamp {dt_utc.isoformat()} ({dt_bkk.isoformat()}) "
            f"is {round(delta_seconds, 1)}s in the future relative to current UTC runtime {now_utc.isoformat()}."
        )
        logger.error(msg)
        raise FutureTimestampError(msg)

    return {
        "raw": str(raw_val),
        "source_timezone": "Asia/Bangkok (UTC+07:00)",
        "dt_utc": dt_utc,
        "dt_bkk": dt_bkk,
        "normalized_utc": dt_utc.isoformat(),
        "normalized_bkk": dt_bkk.isoformat(),
        "age_seconds": round(age_seconds, 2),
        "age_minutes": round(age_seconds / 60.0, 2),
        "is_future": delta_seconds > CLOCK_SKEW_TOLERANCE_SECONDS
    }
