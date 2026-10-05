"""RID public reservoir adapter. Only source-complete live rows may leave adapter."""

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from apps.api.app.core.config import settings
from apps.api.app.core.provenance import (
    make_provenance,
    DataCategory,
    SourceVerification,
    ValueNature,
    GeocodingPrecision,
)
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
from apps.api.app.adapters.thaiwater import PRACHINBURI_BBOX

logger = logging.getLogger(__name__)

RID_AUDIT_EXPLANATION = (
    "The RID public API supports storage/volume/inflow/outflow fields, but usable current telemetry "
    "for the selected Prachin Buri reservoirs was unavailable/empty at audit time."
)


def _localized(value: Any) -> str:
    return str(value.get("th") or "").strip() if isinstance(value, dict) else str(value or "").strip()


def _number(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return result if math.isfinite(result) else None


def _source_timestamp(item: dict, payload: dict) -> Optional[str]:
    value = item.get("timestamp") or item.get("date") or payload.get("date")
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    parsed = parsed.astimezone(timezone.utc)
    age = (datetime.now(timezone.utc) - parsed).total_seconds()
    if age < 0 or age > 24 * 60 * 60:
        return None
    return parsed.isoformat()


def _records(payload: Any) -> list[dict]:
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        return []
    found = []
    for region in payload["data"]:
        if not isinstance(region, dict) or not isinstance(region.get("reservoir"), list):
            continue
        found.extend(item for item in region["reservoir"] if isinstance(item, dict))
    return found


async def fetch_rid_reservoirs() -> List[Dict[str, Any]]:
    access = evaluate_source_access(
        "rid_reservoirs",
        credential_override=settings.RID_PRIVATE_TOKEN,
        enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION,
        allow_official_public=settings.ALLOW_OFFICIAL_PUBLIC_PRODUCTION,
    )
    if access.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
        logger.info("RID reservoir data unavailable: access or redistribution evidence is not verified.")
        return []

    try:
        async with httpx.AsyncClient(timeout=settings.TIMEOUT_NORMAL_SECONDS) as client:
            response = await client.get(settings.RID_RESERVOIR_API_URL, headers={"User-Agent": "Ruwaigon/1.0 reservoir data client"})
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("RID request unavailable (%s)", type(exc).__name__)
        return []

    results = []
    min_lat, max_lat = PRACHINBURI_BBOX["min_lat"], PRACHINBURI_BBOX["max_lat"]
    min_lon, max_lon = PRACHINBURI_BBOX["min_lon"], PRACHINBURI_BBOX["max_lon"]
    for item in _records(payload):
        geocode = item.get("geocode") if isinstance(item.get("geocode"), dict) else {}
        province = _localized(item.get("province_name") or item.get("province") or geocode.get("province_name"))
        if "ปราจีนบุรี" not in province:
            continue
        reservoir_id = str(item.get("id") or "").strip()
        name = _localized(item.get("name_th") or item.get("name") or item.get("reservoir_name"))
        latitude = _number(item.get("latitude") if item.get("latitude") is not None else item.get("lat"))
        longitude = _number(item.get("longitude") if item.get("longitude") is not None else item.get("lon"))
        volume = _number(item.get("volume"))
        timestamp = _source_timestamp(item, payload)
        if (
            not reservoir_id or not name or latitude is None or longitude is None or volume is None or timestamp is None
            or not min_lat <= latitude <= max_lat or not min_lon <= longitude <= max_lon
        ):
            continue

        capacity = _number(item.get("capacity"))
        percent = _number(item.get("percent_storage"))
        inflow = _number(item.get("inflow"))
        outflow = _number(item.get("outflow"))
        provenance = make_provenance(
            agency="Royal Irrigation Department (RID)",
            dataset="RID public reservoir telemetry",
            category=DataCategory.MEASURED_FACT,
            source_verification=SourceVerification.VERIFIED_OFFICIAL,
            url=settings.RID_RESERVOIR_API_URL,
            official_id=reservoir_id,
            original_timestamp=timestamp,
            unit="MCM",
            geocoding_precision=GeocodingPrecision.OFFICIAL_COORDINATES,
            value_nature=ValueNature.OBSERVED,
            measurement_status="PHYSICAL_RESERVOIR_TELEMETRY",
            access_method=access.access_method,
            authorization_status=access.authorization_status.value,
            license=access.license,
            license_url=access.license_url,
            raw_storage_allowed=access.raw_storage_allowed,
            derived_output_allowed=access.derived_output_allowed,
            redistribution_allowed=access.redistribution_allowed,
            transformation="Selected only source records with exact Prachin Buri province, in-scope coordinates, current timestamp, and measured volume.",
        ).to_dict()
        provenance["scope_filter"] = "province_name:ปราจีนบุรี"
        results.append({
            "id": reservoir_id,
            "name_th": name,
            "capacity_mcm": capacity,
            "storage_mcm": volume,
            "storage_percent": percent,
            "inflow_mcm_day": inflow,
            "outflow_mcm_day": outflow,
            "latitude": latitude,
            "longitude": longitude,
            "district": _localized(item.get("district")) or None,
            "status": "TELEMETRY_RECORDED",
            "provenance": provenance,
        })
    return results
