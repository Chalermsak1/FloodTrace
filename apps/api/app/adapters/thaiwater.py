import httpx
import logging
import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from apps.api.app.core.config import settings
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature, FreshnessStatus, GeocodingPrecision, VerificationStatus
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
from apps.api.app.core.datetime_utils import parse_thaiwater_timestamp, FutureTimestampError

logger = logging.getLogger(__name__)


class SourceRecords(list):
    """Parsed records plus the HTTP response status that produced them."""

    def __init__(self, records: list[dict[str, Any]], http_status: int):
        super().__init__(records)
        self.http_status = http_status

# Prachin Buri Province & Basin Bounding Box (Lat: 13.58 - 14.46, Lon: 101.13 - 102.13)
PRACHINBURI_BBOX = {
    "min_lat": 13.58,
    "max_lat": 14.46,
    "min_lon": 101.13,
    "max_lon": 102.13
}


def _localized(value: Any, language: str = "th") -> str:
    if isinstance(value, dict):
        value = value.get(language)
    return str(value or "").strip()


def _number_or_none(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool) or (isinstance(value, str) and not value.strip()):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError, OverflowError):
        raise ValueError("THAIWATER_MEASUREMENT_INVALID")
    if not math.isfinite(parsed):
        raise ValueError("THAIWATER_MEASUREMENT_INVALID")
    return parsed


def _source_rows(payload: Any, nested_key: Optional[str] = None) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise ValueError("THAIWATER_SCHEMA_INVALID")
    nested = payload.get(nested_key, {}) if nested_key else {}
    rows = nested.get("data") if isinstance(nested, dict) else None
    if rows is None:
        rows = payload.get("data")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ValueError("THAIWATER_SCHEMA_INVALID")
    return rows


def _normalized_source_time(value: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return parse_thaiwater_timestamp(value)
    except (FutureTimestampError, ValueError, TypeError, OverflowError):
        return None

async def fetch_thaiwater_stations() -> List[Dict[str, Any]]:
    """
    Fetches real-time water level telemetry from official ThaiWater / HII API.
    Audited: Evaluates source access authorization under Master Prompt Section 1, 2 & 7.
    Returns real water level telemetry stations for Prachin Buri.
    """
    access_eval = evaluate_source_access(
        "thaiwater_rid_runoff", 
        credential_override=settings.THAIWATER_API_KEY,
        enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION,
        allow_official_public=settings.ALLOW_OFFICIAL_PUBLIC_PRODUCTION
    )
    if access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
        raise RuntimeError("THAIWATER_ACCESS_BLOCKED")

    headers = {"User-Agent": "FloodTracePlatform/1.0 (official-data-integrity-audit)"}
    if settings.THAIWATER_API_KEY:
        headers["Authorization"] = f"Bearer {settings.THAIWATER_API_KEY}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                settings.THAIWATER_API_URL, 
                headers=headers
            )
            resp.raise_for_status()
            payload = resp.json()
            
            raw_stations = _source_rows(payload, "waterlevel_data")
            results = []
            
            for item in raw_stations:
                geocode = item.get("geocode", {}) or {}
                prov_name = _localized(geocode.get("province_name"))
                basin_meta = item.get("basin", {}) or {}
                basin_name = str(basin_meta.get("basin_name", {}).get("th", "") if isinstance(basin_meta.get("basin_name"), dict) else basin_meta.get("basin_name", ""))
                station_meta = item.get("station", {}) or {}
                st_name_th = _localized(station_meta.get("tele_station_name"))
                st_name_en = _localized(station_meta.get("tele_station_name"), "en")
                
                lat = station_meta.get("tele_station_lat")
                lon = station_meta.get("tele_station_long")
                if lat is None or lon is None:
                    continue

                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except (TypeError, ValueError, OverflowError):
                    continue
                if not math.isfinite(lat_f) or not math.isfinite(lon_f):
                    continue

                # Station names and basin labels do not prove administrative province.
                is_pb_prov = "ปราจีนบุรี" in prov_name
                in_pb_bbox = (PRACHINBURI_BBOX["min_lat"] <= lat_f <= PRACHINBURI_BBOX["max_lat"] and 
                              PRACHINBURI_BBOX["min_lon"] <= lon_f <= PRACHINBURI_BBOX["max_lon"])

                if is_pb_prov and in_pb_bbox:
                    st_code = str(station_meta.get("tele_station_oldcode") or station_meta.get("tele_station_code") or station_meta.get("id") or item.get("id") or "").strip()
                    if not st_code or not st_name_th:
                        continue
                    wl_msl = _number_or_none(item.get("waterlevel_msl"))
                    ground_raw = station_meta.get("ground_level") if station_meta.get("ground_level") is not None else item.get("ground_level")
                    warning_raw = station_meta.get("warning_level_m") if station_meta.get("warning_level_m") is not None else item.get("warning_level")
                    critical_raw = station_meta.get("critical_level_msl")
                    if critical_raw is None:
                        critical_raw = station_meta.get("critical_level_m") if station_meta.get("critical_level_m") is not None else item.get("critical_level")
                    ground_level = _number_or_none(ground_raw)
                    warning_level = _number_or_none(warning_raw)
                    critical_level = _number_or_none(critical_raw)
                    dt_str = item.get("waterlevel_datetime")
                    t_meta = _normalized_source_time(dt_str)
                    if t_meta is None:
                        continue
                    norm_obs_time = t_meta["normalized_bkk"]
                    # Audit status strictly based on physical data validity
                    status = "STAGE_RECORDED"
                    if wl_msl is None:
                        status = "NO_DATA"

                    amphoe_name = geocode.get("amphoe_name", {}).get("th", "") if isinstance(geocode.get("amphoe_name"), dict) else str(geocode.get("amphoe_name", ""))

                    prov = make_provenance(
                        agency="Hydroinformatics Institute (HII) / ThaiWater",
                        dataset="National Telemetry Water Level Monitoring",
                        category=DataCategory.MEASURED_FACT if wl_msl is not None else DataCategory.UNVERIFIED,
                        source_verification=SourceVerification.VERIFIED_OFFICIAL,
                        url=settings.THAIWATER_API_URL,
                        official_id=st_code,
                        original_timestamp=norm_obs_time,
                        unit="meters above Mean Sea Level (m MSL)",
                        crs="EPSG:4326 (WGS84)",
                        geocoding_precision=GeocodingPrecision.OFFICIAL_COORDINATES,
                        confidence=1.0,
                        measurement_status="PHYSICAL_SENSOR_TRANSMISSION" if wl_msl is not None else "UNAVAILABLE_EMPTY",
                        model_status="NOT_APPLICABLE",
                        value_nature=ValueNature.OBSERVED,
                        transformation="Filtered by upstream province name 'ปราจีนบุรี' and Prachin Buri geographic bounds (EPSG:4326).",
                        methodology="Direct automated acoustic/pressure stage sensor measurement",
                        access_method=access_eval.access_method,
                        authorization_status=access_eval.authorization_status.value,
                        license=access_eval.license,
                        license_url=access_eval.license_url,
                        raw_storage_allowed=access_eval.raw_storage_allowed,
                        derived_output_allowed=access_eval.derived_output_allowed,
                        redistribution_allowed=access_eval.redistribution_allowed,
                        audit_notes="Official HII telemetry station under Open Government License Thailand (OGL-TH)."
                    )
                    
                    provenance = prov.to_dict()
                    provenance["scope_filter"] = "province_name:ปราจีนบุรี"
                    results.append({
                        "id": st_code,
                        "name_th": st_name_th,
                        "name_en": st_name_en,
                        "basin": basin_name,
                        "district": amphoe_name or None,
                        "latitude": lat_f,
                        "longitude": lon_f,
                        "water_level_msl": float(wl_msl) if wl_msl is not None else None,
                        "ground_level_msl": float(ground_level) if ground_level is not None else None,
                        "warning_level_msl": float(warning_level) if warning_level is not None else None,
                        "critical_level_msl": float(critical_level) if critical_level is not None else None,
                        "observation_time": norm_obs_time,
                        "raw_observation_time": dt_str,
                        "status": status,
                        "provenance": provenance
                    })
                    
            logger.info(f"Audited {len(results)} water stations for Prachin Buri from ThaiWater.")
            return SourceRecords(results, resp.status_code)
        except Exception as e:
            logger.error("ThaiWater water-level request failed (%s)", type(e).__name__)
            raise


async def fetch_thaiwater_rainfall() -> List[Dict[str, Any]]:
    """
    Fetches real-time 24-hour rainfall telemetry from official ThaiWater / HII API.
    Audited: Evaluates source access authorization under Master Prompt Section 1, 2 & 7.
    Returns real rain telemetry stations for Prachin Buri.
    """
    access_eval = evaluate_source_access(
        "thaiwater_rainfall", 
        credential_override=settings.THAIWATER_API_KEY,
        enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION,
        allow_official_public=settings.ALLOW_OFFICIAL_PUBLIC_PRODUCTION
    )
    if access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
        raise RuntimeError("THAIWATER_ACCESS_BLOCKED")

    headers = {"User-Agent": "FloodTracePlatform/1.0 (official-data-integrity-audit)"}
    if settings.THAIWATER_API_KEY:
        headers["Authorization"] = f"Bearer {settings.THAIWATER_API_KEY}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                settings.THAIWATER_RAIN_API_URL, 
                headers=headers
            )
            resp.raise_for_status()
            payload = resp.json()
            
            raw_stations = _source_rows(payload)
            results = []
            
            for item in raw_stations:
                geocode = item.get("geocode", {}) or {}
                prov_name = _localized(geocode.get("province_name"))
                amphoe_name = _localized(geocode.get("amphoe_name"))
                tumbon_name = _localized(geocode.get("tumbon_name"))
                
                basin_meta = item.get("basin", {}) or {}
                basin_name = _localized(basin_meta.get("basin_name"))
                
                station_meta = item.get("station", {}) or {}
                st_name_th = _localized(station_meta.get("tele_station_name"))
                st_name_en = _localized(station_meta.get("tele_station_name"), "en")
                
                lat = station_meta.get("tele_station_lat")
                lon = station_meta.get("tele_station_long")
                if lat is None or lon is None:
                    continue

                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except (TypeError, ValueError, OverflowError):
                    continue
                if not math.isfinite(lat_f) or not math.isfinite(lon_f):
                    continue

                # Station names and basin labels do not prove administrative province.
                is_pb_prov = "ปราจีนบุรี" in prov_name
                in_pb_bbox = (PRACHINBURI_BBOX["min_lat"] <= lat_f <= PRACHINBURI_BBOX["max_lat"] and 
                              PRACHINBURI_BBOX["min_lon"] <= lon_f <= PRACHINBURI_BBOX["max_lon"])

                if is_pb_prov and in_pb_bbox:
                    st_code = str(station_meta.get("tele_station_oldcode") or station_meta.get("tele_station_code") or station_meta.get("id") or item.get("id") or "").strip()
                    if not st_code or not st_name_th:
                        continue
                    rain_24h = _number_or_none(item.get("rain_24h"))
                    rain_1h = _number_or_none(item.get("rain_1h"))
                    if (rain_24h is not None and rain_24h < 0) or (rain_1h is not None and rain_1h < 0):
                        continue
                    dt_str = item.get("rainfall_datetime")
                    t_meta = _normalized_source_time(dt_str)
                    if t_meta is None:
                        continue
                    norm_obs_time = t_meta["normalized_bkk"]
                    
                    agency_meta = item.get("agency", {}) or {}
                    agency_short = agency_meta.get("agency_shortname", {}).get("th", "สสน.") if isinstance(agency_meta.get("agency_shortname"), dict) else "สสน."

                    status = "RAINFALL_RECORDED" if rain_24h is not None else "NO_DATA"

                    prov = make_provenance(
                        agency="Hydroinformatics Institute (HII) / ThaiWater",
                        dataset="Automated Ground Weather Station Precipitation Network",
                        category=DataCategory.MEASURED_FACT if rain_24h is not None else DataCategory.UNVERIFIED,
                        source_verification=SourceVerification.VERIFIED_OFFICIAL,
                        url=settings.THAIWATER_RAIN_API_URL,
                        official_id=st_code,
                        original_timestamp=norm_obs_time,
                        unit="millimeters (mm)",
                        crs="EPSG:4326 (WGS84)",
                        geocoding_precision=GeocodingPrecision.OFFICIAL_COORDINATES,
                        confidence=1.0,
                        measurement_status="PHYSICAL_GAUGE_TRANSMISSION" if rain_24h is not None else "UNAVAILABLE_EMPTY",
                        model_status="NOT_APPLICABLE",
                        value_nature=ValueNature.OBSERVED,
                        transformation="Filtered by exact upstream province name and geographic bounds of Prachin Buri.",
                        methodology="Automated tipping bucket / acoustic precipitation gauge measurement",
                        access_method=access_eval.access_method,
                        authorization_status=access_eval.authorization_status.value,
                        license=access_eval.license,
                        license_url=access_eval.license_url,
                        raw_storage_allowed=access_eval.raw_storage_allowed,
                        derived_output_allowed=access_eval.derived_output_allowed,
                        redistribution_allowed=access_eval.redistribution_allowed,
                        audit_notes="Official HII automatic rainfall station under Open Government License Thailand (OGL-TH)."
                    )
                    
                    provenance = prov.to_dict()
                    provenance["scope_filter"] = "province_name:ปราจีนบุรี"
                    results.append({
                        "id": st_code,
                        "name_th": st_name_th,
                        "name_en": st_name_en,
                        "basin": basin_name or None,
                        "district": amphoe_name or ("เมืองปราจีนบุรี" if is_pb_prov else prov_name),
                        "subdistrict": tumbon_name,
                        "latitude": lat_f,
                        "longitude": lon_f,
                        "rain_24h_mm": float(rain_24h) if rain_24h is not None else None,
                        "rain_1h_mm": float(rain_1h) if rain_1h is not None else None,
                        "observation_time": norm_obs_time,
                        "raw_observation_time": dt_str,
                        "agency": agency_short,
                        "status": status,
                        "provenance": provenance
                    })
                    
            logger.info(f"Audited {len(results)} rainfall stations for Prachin Buri from ThaiWater.")
            return SourceRecords(results, resp.status_code)
        except Exception as e:
            logger.error("ThaiWater rainfall request failed (%s)", type(e).__name__)
            raise
