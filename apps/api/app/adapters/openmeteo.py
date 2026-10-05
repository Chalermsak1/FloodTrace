import time
import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from apps.api.app.core.config import settings
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature, FreshnessStatus, GeocodingPrecision, VerificationStatus
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
from apps.api.app.core.circuit_breaker import get_circuit_breaker, ErrorClassification

logger = logging.getLogger(__name__)

STATIONS_COORDINATES = {
    "prachin_mueang": {"name": "อ.เมืองปราจีนบุรี", "lat": 14.0535, "lon": 101.3868},
    "kabin_buri": {"name": "อ.กบินทร์บุรี", "lat": 13.9912, "lon": 101.7231},
    "si_maha_phot": {"name": "อ.ศรีมหาโพธิ (นิคม 304)", "lat": 13.8824, "lon": 101.5218}
}

# In-memory TTL cache for forecast requests to avoid hammering upstream API and improve latency SLO
_FORECAST_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes cache

async def fetch_openmeteo_forecast(station_key: str = "prachin_mueang", is_test_mode: bool = False) -> Dict[str, Any]:
    """
    Fetches numerical weather forecast.
    Master Prompt Section 2 & 10:
    - In PRODUCTION: Public Open-Meteo and TMD open API without project credentials
      fail-closed returning FORECAST_UNAVAILABLE / ACCESS_REQUIRED.
    - In TEST: Public Open-Meteo test endpoint may be exercised only in isolated test runs.
    """
    station = STATIONS_COORDINATES.get(station_key, STATIONS_COORDINATES["prachin_mueang"])
    lat = station["lat"]
    lon = station["lon"]

    # Evaluate production source access authorization FIRST (Strict Fail-Closed)
    access_eval = evaluate_source_access(
        "tmd_forecast",
        credential_override=settings.TMD_API_KEY,
        enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION
    )

    is_production = settings.DATA_ENV == "PRODUCTION" or settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION
    if is_production and not is_test_mode and access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
        logger.warning(
            f"Forecast ingestion BLOCKED for production: {access_eval.current_status}. "
            f"Public Open-Meteo/TMD endpoints blocked from production factual data. Cache bypass blocked."
        )
        return {
            "status": "FORECAST_UNAVAILABLE",
            "forecast_status": "FORECAST_UNAVAILABLE",
            "reason": "ACCESS_REQUIRED",
            "source": "tmd_forecast / Open-Meteo",
            "source_access": access_eval.authorization_status.value,
            "source_access_status": access_eval.current_status,
            "production_allowed": False,
            "station_key": station_key,
            "station_name": station["name"],
            "latitude": lat,
            "longitude": lon,
            "forecast_time": None,
            "horizon": None,
            "model": "ECMWF IFS 0.1° / TMD NWP",
            "model_version": "v2.0-Audit",
            "uncertainty": "HIGH_UNCALIBRATED",
            "freshness": "UNAVAILABLE",
            "limitations": "Forecast blocked in production under REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True. Public Open-Meteo/TMD endpoints and cache are strictly isolated from production factual paths.",
            "forecast_days": [],
            "provenance": make_provenance(
                agency="Thai Meteorological Department (TMD) / Open-Meteo",
                dataset="Numerical Weather Prediction",
                category=DataCategory.FORECAST,
                status=VerificationStatus.UNAVAILABLE,
                audit_notes="External forecast source blocked in production factual pipeline under private-only access rule."
            ).to_dict()
        }

    # In non-production / test mode: Check cache to optimize load & stress testing
    now_ts = time.time()
    if station_key in _FORECAST_CACHE:
        cached_entry = _FORECAST_CACHE[station_key]
        if now_ts < cached_entry.get("expires_at", 0):
            cached_data = dict(cached_entry["data"])
            cached_data["cache_status"] = "RECENT_CACHED_TEST_DEV_ONLY"
            return cached_data

    # Circuit breaker check
    cb = get_circuit_breaker("openmeteo")
    if not cb.can_execute():
        logger.warning(f"Open-Meteo circuit breaker is {cb.state.value}. Fast failing request.")
        return {
            "station_key": station_key,
            "station_name": station["name"],
            "error": "CIRCUIT_BREAKER_OPEN — SOURCE TEMPORARILY DISABLED",
            "error_classification": ErrorClassification.SOURCE_UNAVAILABLE.value,
            "circuit_breaker": cb.get_status(),
            "forecast_days": [],
            "provenance": make_provenance(
                agency="Open-Meteo",
                dataset="Numerical Weather Prediction",
                category=DataCategory.UNVERIFIED,
                status=VerificationStatus.UNAVAILABLE,
                audit_notes="Circuit breaker open due to upstream consecutive failures."
            ).to_dict()
        }

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=precipitation,rain,weathercode&daily=precipitation_sum,precipitation_probability_max,precipitation_hours&timezone=Asia%2FBangkok&forecast_days=7"
    
    async with httpx.AsyncClient(timeout=settings.TIMEOUT_FAST_SECONDS) as client:
        try:
            resp = await client.get(url, headers={"User-Agent": "FloodTracePlatform/1.0 (data-integrity-audit)"})
            resp.raise_for_status()
            raw = resp.json()
            cb.record_success()
            
            daily = raw.get("daily", {})
            generation_time = raw.get("generationtime_ms")
            
            prov = make_provenance(
                agency="Open-Meteo Atmospheric Consortium / ECMWF",
                dataset="Global High-Resolution Precipitation Numerical Prediction (IFS 0.1°)",
                category=DataCategory.FORECAST,
                source_verification=SourceVerification.VERIFIED_OFFICIAL,
                url=url,
                original_timestamp=datetime.now(timezone.utc).isoformat(),
                unit="mm (millimeters rainfall depth)",
                crs="EPSG:4326 (WGS84)",
                geocoding_precision=GeocodingPrecision.OFFICIAL_COORDINATES,
                confidence=0.90,
                measurement_status="NUMERICAL_WEATHER_PREDICTION",
                model_status="UNCALIBRATED_RUNOFF_NWP_VERIFIED",
                value_nature=ValueNature.FORECAST,
                transformation="Point atmospheric query. Uncalibrated runoff: no local river catchment hydraulics applied.",
                methodology="ECMWF IFS 0.1° ensemble numerical atmospheric model. Model verification: ECMWF operational standard.",
                audit_notes="Forecast represents atmospheric rainfall depth, NOT a validated flood inundation prediction."
            )
            
            days = []
            dates = daily.get("time", [])
            precips = daily.get("precipitation_sum", [])
            probs = daily.get("precipitation_probability_max", [])
            hours = daily.get("precipitation_hours", [])
            
            for i, d in enumerate(dates):
                psum = precips[i] if i < len(precips) else 0.0
                prob = probs[i] if i < len(probs) else 0
                r_hr = hours[i] if i < len(hours) else 0.0
                
                # Factual meteorological rainfall classification (WMO / TMD rainfall intensity standards)
                # Not claiming flood inundation
                rain_intensity_class = "NO_RAIN"
                if psum >= 90.0:
                    rain_intensity_class = "VERY_HEAVY_RAIN (ฝนตกหนักมาก >90mm)"
                elif psum >= 35.0:
                    rain_intensity_class = "HEAVY_RAIN (ฝนตกหนัก 35.1-90mm)"
                elif psum >= 10.0:
                    rain_intensity_class = "MODERATE_RAIN (ฝนปานกลาง 10.1-35mm)"
                elif psum > 0.0:
                    rain_intensity_class = "LIGHT_RAIN (ฝนเล็กน้อย <10mm)"
                    
                days.append({
                    "date": d,
                    "precipitation_sum_mm": float(psum) if psum is not None else 0.0,
                    "probability_max_pct": int(prob) if prob is not None else 0,
                    "rain_hours": float(r_hr) if r_hr is not None else 0.0,
                    "meteorological_intensity": rain_intensity_class,
                    "runoff_status": "UNCALIBRATED — REQUIRES HYDRODYNAMIC MODEL"
                })
                
            result = {
                "station_key": station_key,
                "station_name": station["name"],
                "latitude": lat,
                "longitude": lon,
                "elevation": raw.get("elevation"),
                "forecast_days": days,
                "provenance": prov.to_dict()
            }
            # Cache the successful result
            _FORECAST_CACHE[station_key] = {
                "data": result,
                "cached_at": now_ts,
                "expires_at": now_ts + CACHE_TTL_SECONDS
            }
            return result
        except httpx.TimeoutException as te:
            logger.error(f"Timeout fetching Open-Meteo forecast: {te}")
            cb.record_failure(te, ErrorClassification.TIMEOUT)
            return {
                "station_key": station_key,
                "station_name": station["name"],
                "error": "FORECAST TIMEOUT — UPSTREAM NOT RESPONDING",
                "error_classification": ErrorClassification.TIMEOUT.value,
                "forecast_days": [],
                "provenance": make_provenance(
                    agency="Open-Meteo",
                    dataset="Unavailable",
                    category=DataCategory.UNVERIFIED,
                    status=VerificationStatus.UNAVAILABLE,
                    audit_notes="Upstream numerical forecast gateway timed out."
                ).to_dict()
            }
        except Exception as e:
            logger.error(f"Error fetching Open-Meteo forecast: {e}")
            cb.record_failure(e, ErrorClassification.NETWORK_ERROR)
            return {
                "station_key": station_key,
                "station_name": station["name"],
                "error": "FORECAST UNAVAILABLE — INSUFFICIENT DATA",
                "error_classification": ErrorClassification.NETWORK_ERROR.value,
                "forecast_days": [],
                "provenance": make_provenance(
                    agency="Open-Meteo",
                    dataset="Unavailable",
                    category=DataCategory.UNVERIFIED,
                    status=VerificationStatus.UNAVAILABLE,
                    audit_notes="Upstream numerical forecast gateway could not be reached."
                ).to_dict()
            }
