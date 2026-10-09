from enum import Enum
from datetime import datetime, timezone, date
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict

class DataCategory(str, Enum):
    OFFICIAL_RECORD = "OFFICIAL_RECORD"    # Directly published/registered by an official organization
    MEASURED_FACT = "MEASURED_FACT"        # Physical measurement/telemetry/assay
    DERIVED = "DERIVED"                    # Mathematically or geographically derived from real source data
    MODELED = "MODELED"                    # Model output based on real data
    FORECAST = "FORECAST"                  # Future prediction from a real forecasting system/model
    CITIZEN_REPORTED = "CITIZEN_REPORTED"  # Citizen-submitted observation
    UNVERIFIED = "UNVERIFIED"              # Source/evidence insufficient for factual use

class FreshnessStatus(str, Enum):
    LIVE = "LIVE"              # Near-real-time: observation age <= expected interval
    RECENT = "RECENT"          # Slightly older than expected interval
    DELAYED = "DELAYED"        # Upstream late beyond warning threshold
    STALE = "STALE"            # Observation outside acceptable freshness window
    OFFLINE = "OFFLINE"        # Source requests repeatedly fail or circuit breaker open
    UNKNOWN = "UNKNOWN"        # Insufficient/unstated timestamp
    
    # Backwards compatibility aliases
    CURRENT = "CURRENT"        # Alias for backward compatibility (< 24h)
    HISTORICAL = "HISTORICAL"  # Alias for backward compatibility (> 30d)

class DataTimingMetadata(BaseModel):
    """
    Explicit Timing Model (Section 3, 37):
    Every observation conceptually tracks:
      observed_at: when the upstream source says the measurement occurred
      ingested_at: when FloodTrace successfully received the observation
      processed_at: when FloodTrace finished normalization & derivation
      published_at: when the updated result became available to API/SSE/UI consumers
    """
    observed_at: Optional[datetime] = None
    observed_at_bkk: Optional[str] = None
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    
    # Latency tracking
    source_delay_seconds: Optional[float] = None
    ingestion_latency_ms: Optional[float] = None
    processing_latency_ms: Optional[float] = None
    publication_latency_ms: Optional[float] = None
    end_to_end_latency_seconds: Optional[float] = None

def compute_source_freshness(
    original_timestamp: Optional[Any],
    nominal_interval_seconds: int = 900,
    warning_threshold_seconds: Optional[float] = None,
    stale_threshold_seconds: Optional[float] = None,
    is_source_healthy: bool = True
) -> Dict[str, Any]:
    """
    Computes strict source-aware data freshness classification (Section 7, 8, 38).
    Considers:
      - age_seconds = current_time - observed_at
      - source-specific nominal interval & thresholds
      - source operational health
    """
    warning_th = warning_threshold_seconds or (nominal_interval_seconds * 1.5)
    stale_th = stale_threshold_seconds or (nominal_interval_seconds * 3.0)

    if not is_source_healthy:
        return {
            "status": FreshnessStatus.OFFLINE,
            "status_str": FreshnessStatus.OFFLINE.value,
            "age_seconds": None,
            "age_minutes": None,
            "nominal_interval_seconds": nominal_interval_seconds,
            "warning_threshold_seconds": warning_th,
            "stale_threshold_seconds": stale_th,
            "observed_at_utc": None,
            "observed_at_bkk": None,
            "is_source_healthy": False
        }

    if original_timestamp is None:
        return {
            "status": FreshnessStatus.UNKNOWN,
            "status_str": FreshnessStatus.UNKNOWN.value,
            "age_seconds": None,
            "age_minutes": None,
            "nominal_interval_seconds": nominal_interval_seconds,
            "warning_threshold_seconds": warning_th,
            "stale_threshold_seconds": stale_th,
            "observed_at_utc": None,
            "observed_at_bkk": None,
            "is_source_healthy": is_source_healthy
        }

    now_utc = datetime.now(timezone.utc)
    from apps.api.app.core.datetime_utils import parse_thaiwater_timestamp, BANGKOK_TZ

    dt_utc = None
    dt_bkk_str = None

    try:
        if isinstance(original_timestamp, datetime):
            if original_timestamp.tzinfo is None:
                dt_utc = original_timestamp.replace(tzinfo=BANGKOK_TZ).astimezone(timezone.utc)
                dt_bkk_str = original_timestamp.replace(tzinfo=BANGKOK_TZ).isoformat()
            else:
                dt_utc = original_timestamp.astimezone(timezone.utc)
                dt_bkk_str = original_timestamp.astimezone(BANGKOK_TZ).isoformat()
        elif isinstance(original_timestamp, str):
            t_meta = parse_thaiwater_timestamp(original_timestamp, allow_future=True)
            dt_utc = t_meta["dt_utc"]
            dt_bkk_str = t_meta["normalized_bkk"]
        elif isinstance(original_timestamp, date):
            dt_naive = datetime.combine(original_timestamp, datetime.min.time())
            dt_utc = dt_naive.replace(tzinfo=BANGKOK_TZ).astimezone(timezone.utc)
            dt_bkk_str = dt_naive.replace(tzinfo=BANGKOK_TZ).isoformat()
    except Exception:
        return {
            "status": FreshnessStatus.UNKNOWN,
            "status_str": FreshnessStatus.UNKNOWN.value,
            "age_seconds": None,
            "age_minutes": None,
            "nominal_interval_seconds": nominal_interval_seconds,
            "warning_threshold_seconds": warning_th,
            "stale_threshold_seconds": stale_th,
            "observed_at_utc": None,
            "observed_at_bkk": None,
            "is_source_healthy": is_source_healthy
        }

    delta_sec = (now_utc - dt_utc).total_seconds()
    age_seconds = max(0.0, delta_sec)
    age_minutes = round(age_seconds / 60.0, 1)

    if age_seconds <= (nominal_interval_seconds * 1.1):
        status = FreshnessStatus.LIVE
    elif age_seconds <= warning_th:
        status = FreshnessStatus.RECENT
    elif age_seconds <= stale_th:
        status = FreshnessStatus.DELAYED
    else:
        status = FreshnessStatus.STALE

    return {
        "status": status,
        "status_str": status.value,
        "age_seconds": round(age_seconds, 1),
        "age_minutes": age_minutes,
        "nominal_interval_seconds": nominal_interval_seconds,
        "warning_threshold_seconds": warning_th,
        "stale_threshold_seconds": stale_th,
        "observed_at_utc": dt_utc.isoformat(),
        "observed_at_bkk": dt_bkk_str,
        "is_source_healthy": is_source_healthy
    }

class SourceVerification(str, Enum):
    VERIFIED_OFFICIAL = "VERIFIED_OFFICIAL"    # Directly traced to official agency publishing endpoint
    PROVISIONAL = "PROVISIONAL"                # Unaudited preliminary operational stream
    PENDING_VERIFICATION = "PENDING_VERIFICATION" # Awaiting authority field inspection
    UNVERIFIED = "UNVERIFIED"                  # Unverified community or unconfirmed report
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"    # Insufficient source data
    UNAVAILABLE = "UNAVAILABLE"                # Upstream gateway unavailable

VerificationStatus = SourceVerification # Backwards compatibility alias

class ValueNature(str, Enum):
    OBSERVED = "OBSERVED"                      # Directly measured physical fact
    RECORDED = "RECORDED"                      # Officially registered administrative entry
    DERIVED = "DERIVED"                        # Calculated through spatial/mathematical transform
    MODELED = "MODELED"                        # Output of physical/statistical simulation
    FORECAST = "FORECAST"                      # Prospective prediction

class GeocodingPrecision(str, Enum):
    OFFICIAL_COORDINATES = "OFFICIAL_COORDINATES" # Certified surveyed GPS coordinates
    SUBDISTRICT_CENTROID = "SUBDISTRICT_CENTROID" # Administrative centroid of Tambon
    DISTRICT_CENTROID = "DISTRICT_CENTROID"       # Administrative centroid of Amphoe
    UNRESOLVED = "UNRESOLVED"                     # Text only, no coordinate resolution

def compute_freshness(
    original_timestamp: Optional[Any],
    default_status: Optional[FreshnessStatus] = None,
    max_fresh_hours: Optional[float] = None
) -> tuple[FreshnessStatus, Optional[float]]:
    """
    Calculates source_age_days and assigns FreshnessStatus according to strict elapsed time.
    Supports source-specific freshness thresholds (Section 19).
    """
    if original_timestamp is None:
        return default_status or FreshnessStatus.UNKNOWN, None
    
    try:
        now = datetime.now(timezone.utc)
        
        from apps.api.app.core.datetime_utils import BANGKOK_TZ
        
        if isinstance(original_timestamp, datetime):
            ts = original_timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=BANGKOK_TZ).astimezone(timezone.utc)
            else:
                ts = ts.astimezone(timezone.utc)
            delta = now - ts
            age_days = round(delta.total_seconds() / 86400.0, 2)
        elif isinstance(original_timestamp, date):
            delta = now.date() - original_timestamp
            age_days = max(0.0, float(delta.days))
        elif isinstance(original_timestamp, str):
            orig_str = original_timestamp.strip()
            if not orig_str:
                return default_status or FreshnessStatus.UNKNOWN, None
            if len(orig_str) > 10:
                clean_str = orig_str.replace("Z", "")
                if "+" in clean_str:
                    ts = datetime.fromisoformat(orig_str).astimezone(timezone.utc)
                else:
                    ts_naive = datetime.fromisoformat(clean_str)
                    ts = ts_naive.replace(tzinfo=BANGKOK_TZ).astimezone(timezone.utc)
                delta = now - ts
                age_days = round(delta.total_seconds() / 86400.0, 2)
            else:
                d = date.fromisoformat(orig_str[:10])
                delta = now.date() - d
                age_days = max(0.0, float(delta.days))
        else:
            return default_status or FreshnessStatus.UNKNOWN, None
            
        age_days = max(0.0, age_days)
        if default_status:
            return default_status, age_days
            
        # Source-specific freshness evaluation (Section 19)
        if max_fresh_hours is not None:
            age_hours = age_days * 24.0
            if age_hours <= max_fresh_hours:
                return FreshnessStatus.CURRENT, age_days
            elif age_hours <= max_fresh_hours * 3.0:
                return FreshnessStatus.RECENT, age_days
            elif age_hours <= max_fresh_hours * 10.0:
                return FreshnessStatus.STALE, age_days
            else:
                return FreshnessStatus.HISTORICAL, age_days

        if age_days < 1.0:
            return FreshnessStatus.CURRENT, age_days
        elif age_days <= 7.0:
            return FreshnessStatus.RECENT, age_days
        elif age_days <= 30.0:
            return FreshnessStatus.STALE, age_days
        else:
            return FreshnessStatus.HISTORICAL, age_days
    except Exception:
        return default_status or FreshnessStatus.UNKNOWN, None

class ProvenanceMetadata(BaseModel):
    category: DataCategory = Field(..., description="Strict classification of data nature")
    source_agency: str = Field(..., description="Official government entity or scientific consortium")
    source_dataset: str = Field(..., description="Title of official dataset or catalog")
    source_url: Optional[str] = Field(None, description="Direct URL to open data portal or API")
    retrieval_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    original_timestamp: Optional[str] = Field(None, description="Original observation/publication timestamp")
    
    # 4 Dimensional Distinction
    source_verification: SourceVerification = SourceVerification.VERIFIED_OFFICIAL
    freshness_status: FreshnessStatus = FreshnessStatus.CURRENT
    source_age_days: Optional[float] = None
    measurement_status: str = Field("MEASURED_PHYSICAL", description="Sensor transmission, registry record, or unavailable")
    model_status: Optional[str] = Field(None, description="Calibration status or GIS deterministic methodology")
    value_nature: ValueNature = ValueNature.RECORDED
    confidence: float = Field(1.0, description="Measurement or geodetic confidence (0.0 to 1.0)")
    
    official_id: Optional[str] = Field(None, description="Primary key / license number / station code")
    unit: Optional[str] = Field(None, description="Physical engineering unit (e.g. m MSL, MCM, mm)")
    crs: str = Field("EPSG:4326 (WGS84)", description="Coordinate Reference System")
    geocoding_precision: GeocodingPrecision = GeocodingPrecision.OFFICIAL_COORDINATES
    original_text_location: Optional[str] = None
    transformation: Optional[str] = Field(None, description="Exact formula, filter, or derivation applied")
    methodology: Optional[str] = None
    model_version: Optional[str] = Field(None, description="Analytical model or screening engine version")
    dataset_id: Optional[str] = Field(None, description="Official catalog dataset identifier")
    source_version: Optional[str] = Field(None, description="Source schema or release version")
    access_method: str = Field("OFFICIAL_GOVERNMENT_PORTAL", description="API Key, Institutional MOU, or Open Data Download")
    authorization_status: str = Field("PRIVATE_AUTHORIZED", description="PRIVATE_AUTHORIZED, PUBLIC_ONLY, or ACCESS_REQUIRED")
    license: Optional[str] = Field("Open Government License Thailand (OGL-TH)", description="Dataset legal license")
    license_url: Optional[str] = None
    raw_storage_allowed: bool = Field(True, description="Whether raw source values may be stored internally")
    derived_output_allowed: bool = Field(True, description="Whether safe derived public summaries are permitted")
    redistribution_allowed: bool = Field(True, description="Whether direct redistribution is permitted")
    audit_notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")

def make_provenance(
    agency: str,
    dataset: str,
    category: DataCategory,
    source_verification: SourceVerification = SourceVerification.VERIFIED_OFFICIAL,
    status: Optional[SourceVerification] = None,
    url: Optional[str] = None,
    official_id: Optional[str] = None,
    original_timestamp: Optional[str] = None,
    unit: Optional[str] = None,
    crs: str = "EPSG:4326 (WGS84)",
    geocoding_precision: GeocodingPrecision = GeocodingPrecision.OFFICIAL_COORDINATES,
    confidence: float = 1.0,
    original_text_location: Optional[str] = None,
    transformation: Optional[str] = None,
    methodology: Optional[str] = None,
    model_version: Optional[str] = None,
    dataset_id: Optional[str] = None,
    source_version: Optional[str] = None,
    access_method: str = "OFFICIAL_GOVERNMENT_PORTAL",
    authorization_status: str = "PRIVATE_AUTHORIZED",
    license: Optional[str] = "Open Government License Thailand (OGL-TH)",
    license_url: Optional[str] = None,
    raw_storage_allowed: bool = True,
    derived_output_allowed: bool = True,
    redistribution_allowed: bool = True,
    measurement_status: str = "MEASURED_PHYSICAL",
    model_status: Optional[str] = None,
    value_nature: ValueNature = ValueNature.RECORDED,
    freshness_override: Optional[FreshnessStatus] = None,
    freshness_status: Optional[FreshnessStatus] = None,
    source_age_days: Optional[float] = None,
    audit_notes: Optional[str] = None
) -> ProvenanceMetadata:
    target_freshness = freshness_status or freshness_override
    freshness, calculated_age = compute_freshness(original_timestamp, target_freshness)
    final_age = source_age_days if source_age_days is not None else calculated_age
    final_verification = status if status is not None else source_verification
    
    return ProvenanceMetadata(
        category=category,
        source_agency=agency,
        source_dataset=dataset,
        source_url=url,
        official_id=official_id,
        original_timestamp=original_timestamp,
        source_verification=final_verification,
        freshness_status=freshness,
        source_age_days=final_age,
        measurement_status=measurement_status,
        model_status=model_status,
        value_nature=value_nature,
        confidence=confidence,
        unit=unit,
        crs=crs,
        geocoding_precision=geocoding_precision,
        original_text_location=original_text_location,
        transformation=transformation,
        methodology=methodology,
        model_version=model_version,
        dataset_id=dataset_id,
        source_version=source_version,
        access_method=access_method,
        authorization_status=authorization_status,
        license=license,
        license_url=license_url,
        raw_storage_allowed=raw_storage_allowed,
        derived_output_allowed=derived_output_allowed,
        redistribution_allowed=redistribution_allowed,
        audit_notes=audit_notes
    )
