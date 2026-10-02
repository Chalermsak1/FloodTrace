import httpx
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone
from apps.api.app.core.config import settings
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature, FreshnessStatus, GeocodingPrecision, VerificationStatus
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction

logger = logging.getLogger(__name__)

async def fetch_thaiwater_stations() -> List[Dict[str, Any]]:
    """
    Fetches real-time water level telemetry from official ThaiWater / HII API.
    Audited: Evaluates source access authorization under Master Prompt Section 2 & 7.
    """
    access_eval = evaluate_source_access(
        "thaiwater_telemetry", 
        credential_override=settings.THAIWATER_API_KEY,
        enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION
    )
    if access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
        logger.warning(
            f"ThaiWater ingestion BLOCKED by Source Access Decision Engine: {access_eval.current_status}. "
            f"Private project token required for production pipeline."
        )
        return []

    headers = {"User-Agent": "FloodTracePlatform/1.0 (data-integrity-audit)"}
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
            
            raw_stations = payload.get("waterlevel_data", {}).get("data", []) or payload.get("data", [])
            results = []
            
            for item in raw_stations:
                geocode = item.get("geocode", {}) or {}
                prov_name = str(geocode.get("province_name", {}).get("th", "") if isinstance(geocode.get("province_name"), dict) else geocode.get("province_name", ""))
                basin_name = str(item.get("basin", {}).get("basin_name", {}).get("th", "") if isinstance(item.get("basin"), dict) else item.get("basin_name", ""))
                station_meta = item.get("station", {}) or {}
                st_name_th = str(station_meta.get("tele_station_name", {}).get("th", "") if isinstance(station_meta.get("tele_station_name"), dict) else station_meta.get("tele_station_name", ""))
                st_name_en = str(station_meta.get("tele_station_name", {}).get("en", "") if isinstance(station_meta.get("tele_station_name"), dict) else "")
                
                # Filter specifically for Prachin Buri stations
                if "ปราจีน" in prov_name or "ปราจีน" in basin_name or "ปราจีน" in st_name_th:
                    st_code = str(station_meta.get("tele_station_code") or station_meta.get("id") or item.get("id"))
                    lat = station_meta.get("tele_station_lat")
                    lon = station_meta.get("tele_station_long")
                    
                    if lat is None or lon is None:
                        continue
                        
                    wl_msl = item.get("waterlevel_msl")
                    ground_level = item.get("ground_level")
                    warning_level = item.get("warning_level")
                    critical_level = item.get("critical_level")
                    dt_str = item.get("waterlevel_datetime")
                    
                    # Audit status strictly based on physical data validity
                    status = "STAGE_RECORDED"
                    if wl_msl is None:
                        status = "NO_DATA"
                    elif float(wl_msl) < 0:
                        status = "SENSOR_OUTLIER_STALE" # Flag physical anomalies (e.g. -2.55m)
                    
                    amphoe_name = geocode.get("amphoe_name", {}).get("th", "") if isinstance(geocode.get("amphoe_name"), dict) else str(geocode.get("amphoe_name", ""))

                    is_anomaly = wl_msl is not None and float(wl_msl) < 0
                    verification = SourceVerification.PROVISIONAL if is_anomaly else SourceVerification.VERIFIED_OFFICIAL
                    freshness_override = FreshnessStatus.STALE if is_anomaly else None

                    prov = make_provenance(
                        agency="Hydroinformatics Institute (HII) / ThaiWater",
                        dataset="National Telemetry Water Level Monitoring",
                        category=DataCategory.MEASURED_FACT if wl_msl is not None else DataCategory.UNVERIFIED,
                        source_verification=verification,
                        url="https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load",
                        official_id=st_code,
                        original_timestamp=dt_str,
                        unit="meters above Mean Sea Level (m MSL)",
                        crs="EPSG:4326 (WGS84)",
                        geocoding_precision=GeocodingPrecision.OFFICIAL_COORDINATES,
                        confidence=1.0,
                        measurement_status="PHYSICAL_SENSOR_TRANSMISSION" if wl_msl is not None else "UNAVAILABLE_EMPTY",
                        model_status="NOT_APPLICABLE",
                        value_nature=ValueNature.OBSERVED,
                        freshness_override=freshness_override,
                        transformation="Filtered by province name 'ปราจีนบุรี'. Thresholds left as NULL if omitted upstream.",
                        methodology="Direct automated acoustic/pressure stage sensor measurement",
                        access_method=access_eval.access_method,
                        authorization_status=access_eval.authorization_status.value,
                        license=access_eval.license,
                        license_url=access_eval.license_url,
                        raw_storage_allowed=access_eval.raw_storage_allowed,
                        derived_output_allowed=access_eval.derived_output_allowed,
                        redistribution_allowed=access_eval.redistribution_allowed,
                        audit_notes="Ground level and bankfull thresholds are NULL in upstream API response and NOT assumed."
                    )
                    
                    results.append({
                        "id": st_code,
                        "name_th": st_name_th,
                        "name_en": st_name_en,
                        "basin": basin_name or "ลุ่มน้ำปราจีนบุรี",
                        "district": amphoe_name or "เมืองปราจีนบุรี",
                        "latitude": float(lat),
                        "longitude": float(lon),
                        "water_level_msl": float(wl_msl) if wl_msl is not None else None,
                        "ground_level_msl": float(ground_level) if ground_level is not None else None,
                        "warning_level_msl": float(warning_level) if warning_level is not None else None,
                        "critical_level_msl": float(critical_level) if critical_level is not None else None,
                        "status": status,
                        "provenance": prov.to_dict()
                    })
                    
            logger.info(f"Audited {len(results)} water stations for Prachin Buri from ThaiWater.")
            return results
        except Exception as e:
            logger.error(f"Error fetching ThaiWater telemetry: {e}")
            return []
