import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from apps.api.app.core.config import settings
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature, FreshnessStatus, GeocodingPrecision, VerificationStatus
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction

logger = logging.getLogger(__name__)

# Prachin Buri Province & Basin Bounding Box (Lat: 13.58 - 14.46, Lon: 101.13 - 102.13)
PRACHINBURI_BBOX = {
    "min_lat": 13.58,
    "max_lat": 14.46,
    "min_lon": 101.13,
    "max_lon": 102.13
}

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
        logger.warning(
            f"ThaiWater waterlevel ingestion BLOCKED by Source Access Decision Engine: {access_eval.current_status}."
        )
        return []

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
            
            raw_stations = payload.get("waterlevel_data", {}).get("data", []) or payload.get("data", [])
            results = []
            
            for item in raw_stations:
                geocode = item.get("geocode", {}) or {}
                prov_name = str(geocode.get("province_name", {}).get("th", "") if isinstance(geocode.get("province_name"), dict) else geocode.get("province_name", ""))
                basin_meta = item.get("basin", {}) or {}
                basin_name = str(basin_meta.get("basin_name", {}).get("th", "") if isinstance(basin_meta.get("basin_name"), dict) else basin_meta.get("basin_name", ""))
                station_meta = item.get("station", {}) or {}
                st_name_th = str(station_meta.get("tele_station_name", {}).get("th", "") if isinstance(station_meta.get("tele_station_name"), dict) else station_meta.get("tele_station_name", ""))
                st_name_en = str(station_meta.get("tele_station_name", {}).get("en", "") if isinstance(station_meta.get("tele_station_name"), dict) else "")
                
                lat = station_meta.get("tele_station_lat")
                lon = station_meta.get("tele_station_long")
                if lat is None or lon is None:
                    continue

                lat_f = float(lat)
                lon_f = float(lon)

                # Filter specifically for Prachin Buri stations: by province name OR inside Prachin Buri basin bbox
                is_pb_prov = "ปราจีน" in prov_name or "ปราจีน" in basin_name or "ปราจีน" in st_name_th
                in_pb_bbox = (PRACHINBURI_BBOX["min_lat"] <= lat_f <= PRACHINBURI_BBOX["max_lat"] and 
                              PRACHINBURI_BBOX["min_lon"] <= lon_f <= PRACHINBURI_BBOX["max_lon"])

                if is_pb_prov or in_pb_bbox:
                    st_code = str(station_meta.get("tele_station_oldcode") or station_meta.get("tele_station_code") or station_meta.get("id") or item.get("id"))
                    wl_msl = item.get("waterlevel_msl")
                    ground_level = station_meta.get("ground_level") or item.get("ground_level")
                    warning_level = station_meta.get("warning_level_m") or item.get("warning_level")
                    critical_level = station_meta.get("critical_level_msl") or station_meta.get("critical_level_m") or item.get("critical_level")
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
                        transformation="Filtered by province name 'ปราจีนบุรี' and Prachin Buri basin geographic bounds (EPSG:4326).",
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
                    
                    results.append({
                        "id": st_code,
                        "name_th": st_name_th,
                        "name_en": st_name_en,
                        "basin": basin_name or "ลุ่มน้ำปราจีนบุรี",
                        "district": amphoe_name or ("เมืองปราจีนบุรี" if is_pb_prov else prov_name),
                        "latitude": lat_f,
                        "longitude": lon_f,
                        "water_level_msl": float(wl_msl) if wl_msl is not None else None,
                        "ground_level_msl": float(ground_level) if ground_level is not None else None,
                        "warning_level_msl": float(warning_level) if warning_level is not None else None,
                        "critical_level_msl": float(critical_level) if critical_level is not None else None,
                        "observation_time": dt_str,
                        "status": status,
                        "provenance": prov.to_dict()
                    })
                    
            logger.info(f"Audited {len(results)} water stations for Prachin Buri from ThaiWater.")
            return results
        except Exception as e:
            logger.error(f"Error fetching ThaiWater telemetry: {e}")
            return []


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
        logger.warning(
            f"ThaiWater rainfall ingestion BLOCKED by Source Access Decision Engine: {access_eval.current_status}."
        )
        return []

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
            
            raw_stations = payload.get("data", [])
            results = []
            
            for item in raw_stations:
                geocode = item.get("geocode", {}) or {}
                prov_name = str(geocode.get("province_name", {}).get("th", "") if isinstance(geocode.get("province_name"), dict) else geocode.get("province_name", ""))
                amphoe_name = str(geocode.get("amphoe_name", {}).get("th", "") if isinstance(geocode.get("amphoe_name"), dict) else geocode.get("amphoe_name", ""))
                tumbon_name = str(geocode.get("tumbon_name", {}).get("th", "") if isinstance(geocode.get("tumbon_name"), dict) else geocode.get("tumbon_name", ""))
                
                basin_meta = item.get("basin", {}) or {}
                basin_name = str(basin_meta.get("basin_name", {}).get("th", "") if isinstance(basin_meta.get("basin_name"), dict) else basin_meta.get("basin_name", ""))
                
                station_meta = item.get("station", {}) or {}
                st_name_th = str(station_meta.get("tele_station_name", {}).get("th", "") if isinstance(station_meta.get("tele_station_name"), dict) else station_meta.get("tele_station_name", ""))
                st_name_en = str(station_meta.get("tele_station_name", {}).get("en", "") if isinstance(station_meta.get("tele_station_name"), dict) else "")
                
                lat = station_meta.get("tele_station_lat")
                lon = station_meta.get("tele_station_long")
                if lat is None or lon is None:
                    continue

                lat_f = float(lat)
                lon_f = float(lon)

                # Filter specifically for Prachin Buri: by province name OR inside Prachin Buri basin bbox
                is_pb_prov = "ปราจีน" in prov_name or "ปราจีน" in basin_name or "ปราจีน" in st_name_th
                in_pb_bbox = (PRACHINBURI_BBOX["min_lat"] <= lat_f <= PRACHINBURI_BBOX["max_lat"] and 
                              PRACHINBURI_BBOX["min_lon"] <= lon_f <= PRACHINBURI_BBOX["max_lon"])

                if is_pb_prov or in_pb_bbox:
                    st_code = str(station_meta.get("tele_station_oldcode") or station_meta.get("tele_station_code") or station_meta.get("id") or item.get("id"))
                    rain_24h = item.get("rain_24h")
                    rain_1h = item.get("rain_1h")
                    dt_str = item.get("rainfall_datetime")
                    
                    agency_meta = item.get("agency", {}) or {}
                    agency_short = agency_meta.get("agency_shortname", {}).get("th", "สสน.") if isinstance(agency_meta.get("agency_shortname"), dict) else "สสน."

                    status = "RAINFALL_RECORDED" if rain_24h is not None else "NO_DATA"

                    prov = make_provenance(
                        agency="Hydroinformatics Institute (HII) / ThaiWater",
                        dataset="Automated Ground Weather Station Precipitation Network",
                        category=DataCategory.MEASURED_FACT if rain_24h is not None else DataCategory.UNVERIFIED,
                        source_verification=SourceVerification.VERIFIED_OFFICIAL,
                        url="https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h",
                        official_id=st_code,
                        original_timestamp=dt_str,
                        unit="millimeters (mm)",
                        crs="EPSG:4326 (WGS84)",
                        geocoding_precision=GeocodingPrecision.OFFICIAL_COORDINATES,
                        confidence=1.0,
                        measurement_status="PHYSICAL_GAUGE_TRANSMISSION" if rain_24h is not None else "UNAVAILABLE_EMPTY",
                        model_status="NOT_APPLICABLE",
                        value_nature=ValueNature.OBSERVED,
                        transformation="Filtered by province name and geographic bounds of Prachin Buri.",
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
                    
                    results.append({
                        "id": st_code,
                        "name_th": st_name_th,
                        "name_en": st_name_en,
                        "basin": basin_name or "ลุ่มน้ำบางปะกง",
                        "district": amphoe_name or ("เมืองปราจีนบุรี" if is_pb_prov else prov_name),
                        "subdistrict": tumbon_name,
                        "latitude": lat_f,
                        "longitude": lon_f,
                        "rain_24h_mm": float(rain_24h) if rain_24h is not None else None,
                        "rain_1h_mm": float(rain_1h) if rain_1h is not None else None,
                        "observation_time": dt_str,
                        "agency": agency_short,
                        "status": status,
                        "provenance": prov.to_dict()
                    })
                    
            logger.info(f"Audited {len(results)} rainfall stations for Prachin Buri from ThaiWater.")
            return results
        except Exception as e:
            logger.error(f"Error fetching ThaiWater rainfall: {e}")
            return []
