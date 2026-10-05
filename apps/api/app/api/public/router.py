"""
FloodTrace Public API Router (/api/public/*)
Master Architecture & Safety-by-Design Compliance:
- Strictly sanitized Public DTOs (Zero private factory/reporter fields)
- Three clear classifications: OFFICIAL DATA, COMMUNITY OBSERVATION, MODEL OUTPUT
- Continuous area visualization (Sub-basin polygons, no circular buffers, no facility pins)
- Standardized legal-safe Thai terminology
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Header, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import not_

from apps.api.app.core.database import get_db
from apps.api.app.core.config import settings
from apps.api.app.core.datetime_utils import BANGKOK_TZ
from apps.api.app.core.security import (
    validate_prachin_coordinates,
    generalize_coordinates,
    sanitize_and_strip_exif_image,
    format_standard_error
)
from apps.api.app.models.entities import CitizenReport, CitizenReportVerification, WaterStation, RainfallStation, WaterLevelObservation, RainfallObservation
from apps.api.app.core.provenance import FreshnessStatus, compute_source_freshness
from apps.api.app.core.publication import public_report_predicate, verification_is_valid
from apps.api.app.core.private_media import (
    PrivateMediaNotFound,
    PrivateMediaUnavailable,
    normalize_media_reference,
    read_private_media,
    write_private_media,
)


public_router = APIRouter(prefix="/public", tags=["FloodTrace Public Information Platform"])


def source_freshness(timestamp) -> str:
    return compute_source_freshness(timestamp)[0].value


def _is_public_telemetry_station(station: Any, source_url: str) -> bool:
    provenance = station.provenance if isinstance(station.provenance, dict) else {}
    if (
        provenance.get("source_url") != source_url
        or provenance.get("scope_filter") != "province_name:ปราจีนบุรี"
        or provenance.get("source_verification") != "VERIFIED_OFFICIAL"
        or provenance.get("geocoding_precision") != "OFFICIAL_COORDINATES"
    ):
        return False
    try:
        latitude = float(station.latitude)
        longitude = float(station.longitude)
    except (TypeError, ValueError, OverflowError):
        return False
    min_lon, min_lat, max_lon, max_lat = settings.PRACHINBURI_BBOX
    return (
        latitude == latitude and longitude == longitude
        and min_lat <= latitude <= max_lat
        and min_lon <= longitude <= max_lon
    )


def _is_public_telemetry_observation(observation: Any, source_url: str) -> bool:
    provenance = observation.provenance if isinstance(observation.provenance, dict) else {}
    return (
        observation.ingestion_mode == "EXTERNAL_API"
        and provenance.get("source_url") == source_url
        and provenance.get("scope_filter") == "province_name:ปราจีนบุรี"
        and provenance.get("source_verification") == "VERIFIED_OFFICIAL"
    )


# ============================================================
# Section 2 & 5: Public DTOs (Guaranteed prohibited field exclusion)
# ============================================================

class PublicProvenanceDTO(BaseModel):
    source_agency: str = Field(..., description="หน่วยงานเจ้าของข้อมูล")
    dataset_name: str = Field(..., description="ชื่อชุดข้อมูล")
    category: str = Field(..., description="OFFICIAL, COMMUNITY, หรือ MODEL")
    category_th: str = Field(..., description="ข้อมูลจากหน่วยงาน, รายงานจากประชาชน, หรือ ผลจากแบบจำลอง")
    category_explanation: Optional[str] = Field(None, description="คำอธิบายตามเกณฑ์กฎหมาย")
    source_updated_at: Optional[str] = None
    floodtrace_updated_at: Optional[str] = None
    license: str = Field(default="UNAVAILABLE")
    source_url: Optional[str] = None

class PublicWatchZoneDTO(BaseModel):
    zone_id: str
    zone_name: str
    district: str
    watch_status: str = Field(..., description="STATUS 1: ไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน, STATUS 2: มีรายงานจากประชาชน, STATUS 3: ควรได้รับการตรวจสอบเพิ่มเติม, STATUS 4: มีผลตรวจจากหน่วยงาน")
    verification_priority: str = Field(..., description="สูง, ปานกลาง, หรือ ต่ำ")
    verification_priority_label: str = Field(..., description="ลำดับความสำคัญในการตรวจสอบ: สูง/ปานกลาง/ต่ำ")
    verification_priority_explanation: str = "ระดับนี้ใช้สำหรับจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบเพิ่มเติม ไม่ใช่การยืนยันว่ามีการปนเปื้อน"
    flood_status: str
    hydrological_connectivity_status: str
    community_observation_count: int
    forecast_watch_status: str
    official_sampling_status: str
    sensitive_receptor_summary: str
    data_confidence: str = Field(..., description="คุณภาพข้อมูล: สูง, ปานกลาง, ต่ำ")
    data_freshness: str = Field(..., description="สดใหม่, ปานกลาง, ข้อมูลอาจไม่สะท้อนสถานการณ์ปัจจุบัน")
    why_this_area: List[str]
    why_this_area_disclaimer: str = "ไม่มีข้อมูลใดในรายการนี้เพียงอย่างเดียวที่สามารถใช้ยืนยันการปนเปื้อนได้"
    updated_at: str
    geometry: Dict[str, Any]
    provenance: PublicProvenanceDTO

class PublicAreaSummaryDTO(BaseModel):
    district: str
    current_status: str
    verification_priority: str
    verification_priority_label: str
    verification_priority_explanation: str
    flood_status: str
    community_observation_summary: str
    community_observation_count: int
    official_sampling_status: str
    forecast_watch_summary: str
    data_confidence: str
    data_freshness: str
    last_updated: Optional[str]
    why_this_area: List[str]
    why_this_area_disclaimer: str
    provenance: PublicProvenanceDTO

class PublicObservationDTO(BaseModel):
    id: str
    category: str = Field(..., description="น้ำเปลี่ยนสี, คราบบนผิวน้ำ, กลิ่นผิดปกติ, ฟอง / ตะกอนผิดปกติ, สัตว์น้ำตาย, ขยะ / วัสดุผิดปกติ, อื่น ๆ")
    district: str
    subdistrict: Optional[str] = None
    generalized_location: str = Field(..., description="คำอธิบายพื้นที่แบบกว้าง (ไม่ระบุพิกัดบ้าน)")
    generalized_latitude: float
    generalized_longitude: float
    observation_time: Optional[str] = None
    status: str = Field(default="UNVERIFIED", description="UNVERIFIED หรือ TEST_DEMO")
    status_label: str = Field(default="รายงานจากประชาชน (ยังไม่ได้รับการยืนยันจากหน่วยงาน)")
    classification: str = Field(default="COMMUNITY")
    classification_explanation: str = "รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน"
    has_photo: bool
    photo_url: Optional[str] = None
    created_at: Optional[str] = None

class PublicOfficialUpdateDTO(BaseModel):
    id: str
    agency: str = Field(..., description="หน่วยงานเจ้าของข้อมูล เช่น คพ., สคพ.7, กรอ., กรมชลฯ, สสน., GISTDA, กรมอุตุฯ")
    title: str
    document_type: str = Field(..., description="รายงานผลตรวจวัดคุณภาพน้ำ, ประกาศสถานการณ์น้ำ, แถลงการณ์")
    published_at: str
    related_area: str
    factual_summary: str
    source_url: str
    lab_detected_substance: Optional[str] = None
    attribution_status: str = Field(default="ยังไม่ทราบ / อยู่ระหว่างตรวจสอบ", description="ยังไม่ทราบ, อยู่ระหว่างตรวจสอบ, หรือ หน่วยงานระบุแหล่งกำเนิดแล้ว")
    badge: str = Field(default="OFFICIAL", description="ข้อมูลจากหน่วยงาน")
    provenance: PublicProvenanceDTO

class PublicTelemetryStationDTO(BaseModel):
    station_id: str
    name_th: str
    basin: Optional[str] = None
    district: Optional[str] = None
    latitude: float
    longitude: float
    water_level_msl: Optional[float] = None
    warning_level_msl: Optional[float] = None
    critical_level_msl: Optional[float] = None
    status: Optional[str] = None
    source_timestamp: Optional[str] = None
    freshness_status: str = "UNKNOWN"
    provenance: PublicProvenanceDTO

class PublicRainfallStationDTO(BaseModel):
    station_id: str
    name_th: str
    basin: Optional[str] = None
    district: Optional[str] = None
    subdistrict: Optional[str] = None
    latitude: float
    longitude: float
    rain_24h_mm: Optional[float] = None
    rain_1h_mm: Optional[float] = None
    agency: Optional[str] = None
    status: Optional[str] = None
    source_timestamp: Optional[str] = None
    freshness_status: str = "UNKNOWN"
    provenance: PublicProvenanceDTO

class HistoricalObservationDTO(BaseModel):
    id: str
    station_id: str
    value: Optional[float] = None
    unit: str
    source_timestamp: Optional[str] = None
    retrieved_at: Optional[str] = None
    source_name: str
    organization: str
    dataset: str
    data_classification: str
    freshness_status: str
    ingestion_mode: str

class StationHistoryResponseDTO(BaseModel):
    station_id: str
    station_name: str
    station_type: str # WATER_LEVEL or RAINFALL
    time_range: str # 24h, 7d, 30d
    total_records: int
    latest_timestamp: Optional[str] = None
    observations: List[HistoricalObservationDTO]
    provenance: PublicProvenanceDTO

# ============================================================

@public_router.get("/overview", response_model=Dict[str, Any])
def get_public_overview(
    district: str = Query("กบินทร์บุรี", description="อำเภอที่เลือก"),
    db: Session = Depends(get_db)
):
    reports_query = db.query(CitizenReport).filter(
        public_report_predicate(),
        CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
        CitizenReport.reporter_role != "TEST/DEMO",
    )
    reports_count = reports_query.count()
    water_rows = [row for row in db.query(WaterStation).all() if _is_public_telemetry_station(row, settings.THAIWATER_API_URL)]
    rain_rows = [row for row in db.query(RainfallStation).all() if _is_public_telemetry_station(row, settings.THAIWATER_RAIN_API_URL)]
    current_water = [row for row in water_rows if row.water_level_msl is not None and source_freshness((row.provenance or {}).get("original_timestamp")) == FreshnessStatus.CURRENT.value]
    current_rain = [row for row in rain_rows if (row.rain_24h_mm is not None or row.rain_1h_mm is not None) and source_freshness((row.provenance or {}).get("original_timestamp")) == FreshnessStatus.CURRENT.value]

    def telemetry_freshness(rows, has_measurement):
        statuses = []
        for row in rows:
            if not has_measurement(row):
                continue
            provenance = row.provenance if isinstance(row.provenance, dict) else {}
            statuses.append(source_freshness(provenance.get("original_timestamp")))
        if FreshnessStatus.CURRENT.value in statuses:
            return FreshnessStatus.CURRENT.value
        if not statuses:
            return FreshnessStatus.UNKNOWN.value if rows else "UNAVAILABLE"
        for state in (FreshnessStatus.RECENT.value, FreshnessStatus.STALE.value, FreshnessStatus.HISTORICAL.value):
            if state in statuses:
                return state
        return FreshnessStatus.UNKNOWN.value

    water_source_freshness = telemetry_freshness(water_rows, lambda row: row.water_level_msl is not None)
    rain_source_freshness = telemetry_freshness(rain_rows, lambda row: row.rain_24h_mm is not None or row.rain_1h_mm is not None)
    source_times = []
    for row in water_rows + rain_rows:
        provenance = row.provenance if isinstance(row.provenance, dict) else {}
        timestamp = provenance.get("original_timestamp")
        if source_freshness(timestamp) != FreshnessStatus.UNKNOWN.value:
            try:
                source_times.append(datetime.fromisoformat(str(timestamp).replace("Z", "+00:00")).astimezone(timezone.utc))
            except (TypeError, ValueError, OverflowError):
                pass
    latest_source_time = max(source_times) if source_times else None
    latest_iso = latest_source_time.isoformat() if latest_source_time else None
    latest_th = latest_source_time.astimezone(BANGKOK_TZ).strftime("%d/%m/%Y %H:%M") if latest_source_time else None
    surface = build_station_priority_points(water_rows, rain_rows)
    priority_counts = None
    if surface["priority_counts"] is not None:
        priority_counts = {"high": surface["priority_counts"]["VERY_HIGH"] + surface["priority_counts"]["HIGH"]}
    return {
        "selected_area": f"อำเภอ{district} จังหวัดปราจีนบุรี", "district": district,
        "current_status": "ไม่สามารถยืนยันได้", "verification_priority": "ไม่สามารถยืนยันได้",
        "verification_priority_label": "ไม่สามารถยืนยันได้", "flood_status": "ไม่สามารถยืนยันได้",
        "community_observation_count": reports_count, "community_observation_summary": "ไม่มีข้อมูล" if reports_count == 0 else f"รายงานจากประชาชน {reports_count} รายการ",
        "official_sampling_status": "ไม่มีข้อมูล", "forecast_watch_summary": "ไม่มีข้อมูล",
        "data_confidence": "ไม่สามารถยืนยันได้", "data_freshness": "ข้อมูลสถานีปัจจุบัน" if current_water or current_rain else "ข้อมูลสถานีไม่เป็นปัจจุบัน" if any(state in {FreshnessStatus.RECENT.value, FreshnessStatus.STALE.value, FreshnessStatus.HISTORICAL.value} for state in (water_source_freshness, rain_source_freshness)) else "ไม่สามารถยืนยันได้",
        "last_updated": latest_iso, "system_updated_at_th": latest_th, "system_updated_at_iso": latest_iso,
        "why_this_area": ["ไม่มีข้อมูล"], "monitoring_stations_active": len(current_water) + len(current_rain),
        "total_water_stations": len(water_rows), "total_rainfall_stations": len(rain_rows),
        "available_water_station_count": len(current_water), "available_rainfall_station_count": len(current_rain),
        "total_citizen_reports": reports_count, "total_monitoring_cells": None, "priority_counts": priority_counts,
        "disclaimer": "ข้อมูลด้านสิ่งแวดล้อมและสถานการณ์น้ำยังไม่สามารถยืนยันได้.",
        "source_freshness": {
            "thaiwater_water_level": water_source_freshness,
            "thaiwater_rainfall": rain_source_freshness,
            "latest_source_timestamp": latest_iso,
        },
        "monitoring_surface_status": surface["status"],
        "provenance": {"source_agency": "ThaiWater / HII" if source_times else "Ruwaigon", "dataset_name": "Public overview", "category": "MIXED" if source_times else "UNAVAILABLE", "category_th": "ข้อมูลจากหลายประเภท" if source_times else "ไม่มีข้อมูล", "source_updated_at": latest_iso, "floodtrace_updated_at": None}
    }

from apps.api.app.services.spatial_monitoring_service import SpatialMonitoringService, build_station_priority_points

# ============================================================
# Section 24: GET /api/public/map/boundary
# Authoritative Administrative Boundary & Outside Analysis Mask
# ============================================================
@public_router.get("/map/boundary", response_model=Dict[str, Any])
def get_public_map_boundary():
    return {"type": "FeatureCollection", "features": [], "status": "UNAVAILABLE / UNVERIFIED", "reason_code": "LOCAL_PROVENANCE_UNVERIFIED"}

@public_router.get("/map/monitoring-priority", response_model=Dict[str, Any])
def get_public_map_monitoring_priority(
    bbox: Optional[str] = Query(None, description="Bounding box minLon,minLat,maxLon,maxLat"),
    zoom: Optional[int] = Query(None, description="Current map zoom level"),
    district: Optional[str] = Query(None, description="Optional district filter"),
    province: Optional[str] = Query("ปราจีนบุรี", description="Active province"),
    db: Session = Depends(get_db)
):
    from apps.api.app.services.spatial_monitoring_service import build_station_priority_points

    if province not in (None, "ปราจีนบุรี"):
        return {
            "type": "FeatureCollection",
            "features": [],
            "status": "UNAVAILABLE",
            "reason_code": "UNSUPPORTED_SCOPE",
            "provenance": {"category": "MODEL"},
        }
    bbox_values = None
    if bbox:
        try:
            bbox_values = tuple(float(value.strip()) for value in bbox.split(","))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail={"error": "INVALID_REQUEST", "message": "Invalid bounding box"})
        if len(bbox_values) != 4 or bbox_values[0] >= bbox_values[2] or bbox_values[1] >= bbox_values[3]:
            raise HTTPException(status_code=400, detail={"error": "INVALID_REQUEST", "message": "Invalid bounding box"})

    water_stations = db.query(WaterStation).all()
    rainfall_stations = db.query(RainfallStation).all()
    return build_station_priority_points(
        water_stations,
        rainfall_stations,
        bbox=bbox_values,
        district=district,
    )

@public_router.get("/zones", response_model=Dict[str, Any])
def get_public_watch_zones():
    return {"type": "FeatureCollection", "description": "Unavailable: no verified zone geometry.", "features": [], "total_zones": 0, "status": "UNAVAILABLE", "reason_code": "LOCAL_PROVENANCE_UNVERIFIED"}

@public_router.get("/flood-extent", response_model=Dict[str, Any])
def get_public_flood_extent():
    return {"type": "FeatureCollection", "description": "Forecast and observed flood geometry unavailable.", "features": [], "status": "UNAVAILABLE", "reason_code": "ACCESS_BLOCKED"}

@public_router.get("/forecast-zones", response_model=Dict[str, Any])
def get_public_forecast_zones(
    horizon: str = Query("24h", description="ขณะนี้, 6h, 12h, 24h, 3d, 7d")
):
    return {"type": "FeatureCollection", "horizon": horizon, "features": [], "status": "UNAVAILABLE", "reason_code": "ACCESS_BLOCKED"}

@public_router.get("/waterways", response_model=Dict[str, Any])
def get_public_waterways():
    return {"type": "FeatureCollection", "features": [], "status": "UNAVAILABLE / UNVERIFIED", "reason_code": "LOCAL_ARTIFACT_ABSENT"}

@public_router.get("/stations", response_model=List[PublicTelemetryStationDTO])
def get_public_telemetry_stations(db: Session = Depends(get_db)):
    """
    Returns verified public river gauge and telemetry stations.
    Zero private/industrial coordinates.
    """
    stations = db.query(WaterStation).all()
    results = []
    for s in stations:
        if not _is_public_telemetry_station(s, settings.THAIWATER_API_URL):
            continue
        prov = s.provenance if isinstance(s.provenance, dict) else {}
        source_timestamp = prov.get("original_timestamp")
        freshness = source_freshness(source_timestamp)
        available = freshness == FreshnessStatus.CURRENT.value
        results.append(PublicTelemetryStationDTO(
            station_id=s.id,
            name_th=s.name_th,
            basin=s.basin,
            district=s.district,
            latitude=s.latitude,
            longitude=s.longitude,
            water_level_msl=s.water_level_msl if available else None,
            warning_level_msl=s.warning_level_msl,
            critical_level_msl=s.critical_level_msl,
            status=s.status if available else freshness,
            source_timestamp=source_timestamp if freshness != FreshnessStatus.UNKNOWN.value else None,
            freshness_status=freshness,
            provenance=PublicProvenanceDTO(
                source_agency=prov.get("source_agency") or "UNAVAILABLE",
                dataset_name="ข้อมูลตรวจวัดระดับน้ำโทรมาตร (Telemetry Gauging)",
                category=prov.get("category") or "UNAVAILABLE",
                category_th="ข้อมูลตรวจวัดจากหน่วยงาน" if prov.get("category") in {"OFFICIAL", "MEASURED_FACT"} else "ไม่มีข้อมูล",
                license=prov.get("license") or "UNAVAILABLE",
                source_url=settings.THAIWATER_API_URL,
                source_updated_at=source_timestamp if freshness != FreshnessStatus.UNKNOWN.value else None
            )
        ))
    return results

@public_router.get("/rainfall-stations", response_model=List[PublicRainfallStationDTO])
def get_public_rainfall_stations(db: Session = Depends(get_db)):
    """
    Returns verified public automatic rain gauge stations across Prachin Buri.
    Direct live telemetry from HII / ThaiWater under Open Government License Thailand (OGL-TH).
    """
    stations = db.query(RainfallStation).all()
    results = []
    for s in stations:
        if not _is_public_telemetry_station(s, settings.THAIWATER_RAIN_API_URL):
            continue
        prov = s.provenance if isinstance(s.provenance, dict) else {}
        source_timestamp = s.observation_time or prov.get("original_timestamp")
        freshness = source_freshness(source_timestamp)
        available = freshness == FreshnessStatus.CURRENT.value
        results.append(PublicRainfallStationDTO(
            station_id=s.id,
            name_th=s.name_th,
            basin=s.basin,
            district=s.district,
            subdistrict=s.subdistrict,
            latitude=s.latitude,
            longitude=s.longitude,
            rain_24h_mm=s.rain_24h_mm if available else None,
            rain_1h_mm=s.rain_1h_mm if available else None,
            agency=s.agency,
            status=s.status if available else freshness,
            source_timestamp=source_timestamp if freshness != FreshnessStatus.UNKNOWN.value else None,
            freshness_status=freshness,
            provenance=PublicProvenanceDTO(
                source_agency=prov.get("source_agency") or "UNAVAILABLE",
                dataset_name="ข้อมูลตรวจวัดปริมาณน้ำฝนอัตโนมัติ 24 ชั่วโมง (Rainfall Telemetry)",
                category=prov.get("category") or "UNAVAILABLE",
                category_th="ข้อมูลตรวจวัดจากหน่วยงาน" if prov.get("category") in {"OFFICIAL", "MEASURED_FACT"} else "ไม่มีข้อมูล",
                license=prov.get("license") or "UNAVAILABLE",
                source_url=settings.THAIWATER_RAIN_API_URL,
                source_updated_at=source_timestamp if freshness != FreshnessStatus.UNKNOWN.value else None
            )
        ))
    return results

@public_router.get("/stations/{station_id}/history", response_model=StationHistoryResponseDTO)
def get_station_water_level_history(
    station_id: str,
    range: str = Query("24h", pattern="^(24h|7d|30d)$", description="ช่วงเวลาย้อนหลัง: 24h, 7d, หรือ 30d"),
    db: Session = Depends(get_db)
):
    """
    Master Prompt Section 18:
    Returns historical time-series telemetry observations for a water level station.
    Never overwrites historical records. Supports 24H, 7D, 30D.
    """
    st = db.query(WaterStation).filter(WaterStation.id == station_id).first()
    if not st or not _is_public_telemetry_station(st, settings.THAIWATER_API_URL):
        raise HTTPException(status_code=404, detail="Station not found")

    now = datetime.now(timezone.utc)
    delta_days = 1 if range == "24h" else (7 if range == "7d" else 30)
    cutoff = now - timedelta(days=delta_days)

    records = db.query(WaterLevelObservation).filter(
        WaterLevelObservation.station_id == station_id,
        WaterLevelObservation.source_timestamp >= cutoff,
        WaterLevelObservation.source_timestamp <= now
    ).order_by(WaterLevelObservation.source_timestamp.desc()).all()
    records = [record for record in records if _is_public_telemetry_observation(record, settings.THAIWATER_API_URL)]

    obs_dtos = []
    if records:
        for r in records:
            obs_dtos.append(HistoricalObservationDTO(
                id=r.id,
                station_id=r.station_id,
                value=r.water_level_msl,
                unit="m MSL",
                source_timestamp=r.source_timestamp.isoformat() if r.source_timestamp else None,
                retrieved_at=r.retrieved_at.isoformat() if r.retrieved_at else None,
                source_name=r.source_name,
                organization=r.organization,
                dataset=r.dataset,
                data_classification=r.data_classification,
                freshness_status=source_freshness(r.source_timestamp),
                ingestion_mode=r.ingestion_mode
            ))
    latest_ts = obs_dtos[0].source_timestamp if obs_dtos else None

    return StationHistoryResponseDTO(
        station_id=st.id,
        station_name=st.name_th,
        station_type="WATER_LEVEL",
        time_range=range,
        total_records=len(obs_dtos),
        latest_timestamp=latest_ts,
        observations=obs_dtos,
        provenance=PublicProvenanceDTO(
            source_agency="ThaiWater",
            dataset_name="อนุกรมเวลาระดับน้ำโทรมาตร (Water Level Time-Series)",
            category="OFFICIAL",
            category_th="ข้อมูลจากหน่วยงาน",
            source_url=settings.THAIWATER_API_URL,
            source_updated_at=latest_ts
        )
    )

@public_router.get("/rainfall/{station_id}/history", response_model=StationHistoryResponseDTO)
def get_station_rainfall_history(
    station_id: str,
    range: str = Query("24h", pattern="^(24h|7d|30d)$", description="ช่วงเวลาย้อนหลัง: 24h, 7d, หรือ 30d"),
    db: Session = Depends(get_db)
):
    """
    Master Prompt Section 18:
    Returns historical time-series telemetry observations for a rainfall station.
    Never overwrites historical records. Supports 24H, 7D, 30D.
    """
    st = db.query(RainfallStation).filter(RainfallStation.id == station_id).first()
    if not st or not _is_public_telemetry_station(st, settings.THAIWATER_RAIN_API_URL):
        raise HTTPException(status_code=404, detail="Station not found")

    now = datetime.now(timezone.utc)
    delta_days = 1 if range == "24h" else (7 if range == "7d" else 30)
    cutoff = now - timedelta(days=delta_days)

    records = db.query(RainfallObservation).filter(
        RainfallObservation.station_id == station_id,
        RainfallObservation.source_timestamp >= cutoff,
        RainfallObservation.source_timestamp <= now
    ).order_by(RainfallObservation.source_timestamp.desc()).all()
    records = [record for record in records if _is_public_telemetry_observation(record, settings.THAIWATER_RAIN_API_URL)]

    obs_dtos = []
    if records:
        for r in records:
            obs_dtos.append(HistoricalObservationDTO(
                id=r.id,
                station_id=r.station_id,
                value=r.rain_24h_mm,
                unit="mm",
                source_timestamp=r.source_timestamp.isoformat() if r.source_timestamp else None,
                retrieved_at=r.retrieved_at.isoformat() if r.retrieved_at else None,
                source_name=r.source_name,
                organization=r.organization,
                dataset=r.dataset,
                data_classification=r.data_classification,
                freshness_status=source_freshness(r.source_timestamp),
                ingestion_mode=r.ingestion_mode
            ))
    latest_ts = obs_dtos[0].source_timestamp if obs_dtos else None

    return StationHistoryResponseDTO(
        station_id=st.id,
        station_name=st.name_th,
        station_type="RAINFALL",
        time_range=range,
        total_records=len(obs_dtos),
        latest_timestamp=latest_ts,
        observations=obs_dtos,
        provenance=PublicProvenanceDTO(
            source_agency="ThaiWater",
            dataset_name="อนุกรมเวลาปริมาณน้ำฝน (Rainfall Time-Series)",
            category="OFFICIAL",
            category_th="ข้อมูลจากหน่วยงาน",
            source_url=settings.THAIWATER_RAIN_API_URL,
            source_updated_at=latest_ts
        )
    )

# ============================================================
# Section 14: GET /api/public/my-area
# My Area Watch Query
# ============================================================

@public_router.get("/my-area", response_model=PublicAreaSummaryDTO)
def get_public_my_area(
    district: str = Query(..., description="อำเภอ เช่น กบินทร์บุรี, เมืองปราจีนบุรี, ศรีมหาโพธิ"),
    db: Session = Depends(get_db)
):
    count = db.query(CitizenReport).filter(
        public_report_predicate(),
        CitizenReport.district == district,
        CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
        CitizenReport.reporter_role != "TEST/DEMO",
    ).count()
    return PublicAreaSummaryDTO(
        district=district, current_status="ไม่สามารถยืนยันได้", verification_priority="ไม่สามารถยืนยันได้",
        verification_priority_label="ไม่สามารถยืนยันได้", verification_priority_explanation="ไม่มีข้อมูล",
        flood_status="ไม่สามารถยืนยันได้", community_observation_summary="ไม่มีข้อมูล" if count == 0 else f"รายงานจากประชาชน {count} รายการ",
        community_observation_count=count, official_sampling_status="ไม่มีข้อมูล", forecast_watch_summary="ไม่มีข้อมูล",
        data_confidence="ไม่สามารถยืนยันได้", data_freshness="ไม่สามารถยืนยันได้", last_updated=None,
        why_this_area=["ไม่มีข้อมูล"], why_this_area_disclaimer="ไม่มีข้อมูล",
        provenance=PublicProvenanceDTO(source_agency="Ruwaigon", dataset_name="Public area summary", category="UNAVAILABLE", category_th="ไม่มีข้อมูล")
    )

@public_router.get("/observations", response_model=List[PublicObservationDTO])
def get_public_observations(
    district: Optional[str] = Query(None, description="กรองตามอำเภอ"),
    category: Optional[str] = Query(None, description="กรองตามหมวดข้อสังเกต"),
    db: Session = Depends(get_db)
):
    """
    Returns public citizen observations.
    CRITICAL PRIVACY:
    - Exact GPS rounded ~1.1km
    - No reporter name, phone, email, or device IDs
    - Categories: น้ำเปลี่ยนสี, คราบบนผิวน้ำ, กลิ่นผิดปกติ, ฟอง/ตะกอนผิดปกติ, สัตว์น้ำตาย, ขยะ/วัสดุผิดปกติ, อื่น ๆ
    """
    query = db.query(CitizenReport).filter(
        public_report_predicate(),
        CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
        CitizenReport.reporter_role != "TEST/DEMO",
        not_(CitizenReport.reporter_name.ilike("%Test%")),
        not_(CitizenReport.reporter_name.ilike("%Whistleblower%")),
        not_(CitizenReport.reporter_name.ilike("%Fixture%")),
        not_(CitizenReport.reporter_name.ilike("%Synthetic%"))
    )
    if district:
        query = query.filter(CitizenReport.district == district)

    reports = query.order_by(CitizenReport.created_at.desc()).limit(100).all()
    results = []
    for r in reports:
        lat = r.public_latitude if r.public_latitude is not None else r.latitude
        lon = r.public_longitude if r.public_longitude is not None else r.longitude
        gen_lat, gen_lon = generalize_coordinates(lat, lon, decimals=2)
        
        cat = "ข้อสังเกตทั่วไป"
        if r.contamination_signs and isinstance(r.contamination_signs, list) and len(r.contamination_signs) > 0:
            cat = str(r.contamination_signs[0])
            
        if category and category != cat:
            continue

        results.append(PublicObservationDTO(
            id=f"obs_{r.id}",
            category=cat,
            district=r.district or "ปราจีนบุรี",
            subdistrict=r.subdistrict or "ในพื้นที่",
            generalized_location=f"บริเวณ ต.{r.subdistrict or 'ทั่วไป'} อ.{r.district or 'ปราจีนบุรี'}",
            generalized_latitude=gen_lat,
            generalized_longitude=gen_lon,
            observation_time=r.created_at.isoformat() if r.created_at else None,
            status=r.verification_status or "UNVERIFIED",
            status_label="รายงานจากประชาชน (ยังไม่ได้รับการยืนยันจากหน่วยงาน)",
            classification="COMMUNITY",
            classification_explanation="รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน",
            has_photo=bool(r.photo_url),
            photo_url=f"/api/public/reports/{r.id}/media" if r.photo_url else None,
            created_at=r.created_at.isoformat() if r.created_at else None
        ))
    return results

# ============================================================
# Section 19: GET /api/public/official-updates
# Official Updates Center
# ============================================================
@public_router.get("/official-updates", response_model=List[PublicOfficialUpdateDTO])
def get_public_official_updates():
    return []

@public_router.get("/provenance", response_model=Dict[str, Any])
def get_public_provenance_catalog(db: Session = Depends(get_db)):
    """Return source status from the canonical evidence classification."""
    from pathlib import Path
    from apps.api.app.core.source_access import CANDIDATE_SOURCES_REGISTRY, canonical_source_status
    from apps.api.app.core.scheduler import source_scheduler
    from apps.api.app.core.source_health import (
        has_current_external_request_evidence,
        model_runtime_status,
        telemetry_runtime_status,
    )
    from apps.api.app.adapters.openmeteo import get_openmeteo_source_health

    root = Path(__file__).resolve().parents[5]
    scheduler = source_scheduler.get_status()
    sources = []
    for source_id, metadata in CANDIDATE_SOURCES_REGISTRY.items():
        source_status, exists, reason = canonical_source_status(source_id, root)
        source_rows = []
        source_url = None
        if source_id == "thaiwater_rid_runoff":
            source_rows = [row for row in db.query(WaterStation).all() if _is_public_telemetry_station(row, settings.THAIWATER_API_URL)]
            source_url = settings.THAIWATER_API_URL
        elif source_id == "thaiwater_rainfall":
            source_rows = [row for row in db.query(RainfallStation).all() if _is_public_telemetry_station(row, settings.THAIWATER_RAIN_API_URL)]
            source_url = settings.THAIWATER_RAIN_API_URL
        count = len(source_rows) if source_url else None
        measurement_rows = [
            row for row in source_rows
            if (getattr(row, "water_level_msl", None) is not None
                or getattr(row, "rain_24h_mm", None) is not None
                or getattr(row, "rain_1h_mm", None) is not None)
        ]
        timestamp_rows = []
        for row in measurement_rows:
            provenance = row.provenance if isinstance(row.provenance, dict) else {}
            raw = provenance.get("original_timestamp")
            if isinstance(raw, str):
                try:
                    parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                    if parsed.tzinfo is not None:
                        timestamp_rows.append((parsed.astimezone(timezone.utc), raw))
                except (TypeError, ValueError, OverflowError):
                    pass
        latest = max(timestamp_rows, default=(None, None), key=lambda item: item[0])[1]
        freshness = source_freshness(latest)
        if freshness == FreshnessStatus.UNKNOWN.value:
            latest = None
        scheduled = scheduler.get("sources", {}).get(source_id, {})
        current_request = has_current_external_request_evidence(source_status, scheduled)
        measurements = scheduled.get("measurements_received_last_run")
        has_measurement_evidence = current_request and isinstance(measurements, int) and not isinstance(measurements, bool) and measurements > 0
        if source_status == "ACTIVE API":
            runtime_status = telemetry_runtime_status(
                current_request,
                scheduled,
                scheduler.get("scheduler_active") is True,
                has_measurement_evidence,
                bool(count and freshness == FreshnessStatus.CURRENT.value),
            )
            runtime_reason = (
                "UPSTREAM_ERROR" if runtime_status == "UPSTREAM ERROR"
                else "NO_USABLE_MEASUREMENTS" if runtime_status == "PARTIAL"
                else "REQUEST_NOT_VERIFIED" if runtime_status in {"INACTIVE", "NOT CHECKED", "UNVERIFIED"}
                else None
            )
        else:
            runtime_status = source_status
            runtime_reason = None
        sources.append({
            "source_id": source_id,
            "agency": "Hydro-Informatics Institute (HII) via ThaiWater" if source_id in {"thaiwater_rid_runoff", "thaiwater_rainfall"} else metadata["organization"],
            "dataset": metadata["dataset"],
            "status": runtime_status,
            "source_status": source_status,
            "runtime_status": runtime_status,
            "source_exists": exists,
            "database_records": count,
            "latest_source_timestamp": latest,
            "freshness_status": freshness,
            "reason_code": runtime_reason or reason or ("COUNT_NOT_APPLICABLE" if count is None else "TIMESTAMP_UNAVAILABLE" if not latest else None),
            "automated_refresh": scheduled.get("automated_refresh") is True,
            "refresh_interval": f"{scheduled['interval_seconds']} วินาที" if isinstance(scheduled.get("interval_seconds"), int) else None,
            "license_verified": False,
        })
    forecast_health = get_openmeteo_source_health()
    sources.append({
        "source_id": "openmeteo_forecast",
        "agency": "Open-Meteo",
        "dataset": "Numerical weather forecast",
        "family": "MODEL",
        "role": "FORECAST",
        "status": model_runtime_status(forecast_health),
        "source_status": model_runtime_status(forecast_health),
        "runtime_status": model_runtime_status(forecast_health),
        "database_records": None,
        "latest_source_timestamp": None,
        "retrieved_at": forecast_health.get("retrieved_at"),
        "freshness_status": "CURRENT" if model_runtime_status(forecast_health) == "AVAILABLE MODEL" else "UNKNOWN",
        "reason_code": forecast_health.get("last_error") or (None if model_runtime_status(forecast_health) == "AVAILABLE MODEL" else "NO_RECENT_USABLE_FORECAST"),
        "automated_refresh": False,
        "refresh_interval": None,
        "license_verified": False,
    })
    sources.append({
        "source_id": "rid_reservoirs",
        "agency": "Royal Irrigation Department",
        "dataset": "Reservoir telemetry",
        "status": "ACCESS REQUIRED",
        "source_status": "UNAVAILABLE / UNVERIFIED",
        "runtime_status": "ACCESS REQUIRED",
        "database_records": None,
        "latest_source_timestamp": None,
        "freshness_status": FreshnessStatus.UNKNOWN.value,
        "reason_code": "RID_ACCESS_AND_CURRENT_DATA_NOT_VERIFIED",
        "automated_refresh": False,
        "refresh_interval": None,
        "license_verified": False,
    })
    return {
        "sources": sources,
        "limitations": [
            "Missing source evidence remains unavailable.",
            "Open-Meteo forecast is MODEL output and appears only after a recent usable provider response; it is not an observation.",
            "RID access, redistribution terms, and current usable telemetry are unverified; static reservoir substitutes are not used.",
            "Local boundary, mask, and DIW artifacts have unverified provenance.",
        ],
    }


# ============================================================
# Section 21: POST /api/public/reports
# 3-Step Citizen Report Flow (No factory accusation field)
# ============================================================
class PublicReportSubmissionDTO(BaseModel):
    category: str = Field(..., description="น้ำเปลี่ยนสี, คราบบนผิวน้ำ, กลิ่นผิดปกติ, ฟอง / ตะกอนผิดปกติ, สัตว์น้ำตาย, ขยะ / วัสดุผิดปกติ, อื่น ๆ")
    district: str = Field(..., description="อำเภอ")
    subdistrict: Optional[str] = Field(None, description="ตำบล")
    latitude: float = Field(..., description="ละติจูด (ภายในปราจีนบุรี)")
    longitude: float = Field(..., description="ลองจิจูด (ภายในปราจีนบุรี)")
    description: Optional[str] = Field(None, description="คำอธิบายข้อเท็จจริงสั้นๆ (ห้ามใส่ข้อความกล่าวหา)")
    photo_filename: Optional[str] = None
    water_depth_cm: Optional[float] = None
    water_color: Optional[str] = None
    declaration_confirmed: bool = Field(..., description="ฉันยืนยันว่าข้อมูลนี้เป็นสิ่งที่ฉันพบเห็น และไม่ได้ส่งข้อมูลเพื่อกล่าวหาบุคคลหรือองค์กรโดยไม่มีหลักฐาน")


@public_router.post("/reports/upload-photo")
async def upload_public_report_photo(photo: UploadFile = File(...)):
    content = await photo.read()
    clean_bytes, filename = sanitize_and_strip_exif_image(
        content, max_bytes=settings.MAX_UPLOAD_SIZE_BYTES
    )
    try:
        write_private_media(clean_bytes, filename)
    except PrivateMediaUnavailable:
        raise HTTPException(status_code=503, detail="Private media storage unavailable")
    except PrivateMediaNotFound:
        raise HTTPException(status_code=409, detail="Media reference already exists")
    return {"status": "success", "filename": filename, "photo_url": filename}

@public_router.post("/reports", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def submit_public_report(
    payload: PublicReportSubmissionDTO,
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db)
):
    """
    3-Step Citizen Report Submission:
    1. เลือกสิ่งที่พบ
    2. ระบุตำแหน่ง
    3. ตรวจสอบและส่ง พร้อมยืนยัน Declaration
    """
    import uuid
    req_id = getattr(request.state, "request_id", "req_pub_report")
    
    if not payload.declaration_confirmed:
        return format_standard_error(
            code="DECLARATION_REQUIRED",
            message="กรุณากดยืนยันว่าข้อมูลเป็นสิ่งที่ท่านพบเห็นจริง และไม่ได้ส่งข้อมูลเพื่อกล่าวหาบุคคลหรือองค์กรโดยไม่มีหลักฐาน",
            request_id=req_id,
            status_code=400
        )

    # Validate Prachin Buri boundary
    if not validate_prachin_coordinates(payload.latitude, payload.longitude):
        return format_standard_error(
            code="OUT_OF_BOUNDS",
            message="พิกัดที่ระบุอยู่นอกพื้นที่จังหวัดปราจีนบุรี",
            request_id=req_id,
            status_code=400
        )

    clean_desc = (payload.description or "").strip()[:500]
    photo_reference = None
    if payload.photo_filename and payload.photo_filename.strip():
        try:
            photo_reference = normalize_media_reference(payload.photo_filename)
            read_private_media(photo_reference)
        except PrivateMediaUnavailable:
            raise HTTPException(status_code=503, detail="Private media storage unavailable")
        except PrivateMediaNotFound:
            raise HTTPException(status_code=400, detail="Invalid or unavailable media reference")
    report_id = f"FT-2026-{uuid.uuid4().hex[:6].upper()}"
    pub_lat, pub_lon = generalize_coordinates(payload.latitude, payload.longitude, decimals=2)
    
    new_report = CitizenReport(
        id=report_id,
        reporter_name="CITIZEN_PUBLIC",
        reporter_role="CITIZEN",
        category=payload.category,
        exact_latitude=payload.latitude,
        exact_longitude=payload.longitude,
        latitude=pub_lat,
        longitude=pub_lon,
        public_latitude=pub_lat,
        public_longitude=pub_lon,
        water_depth_cm=payload.water_depth_cm or 0.0,
        contamination_signs=[payload.category],
        district=payload.district,
        subdistrict=payload.subdistrict or "ไม่ระบุ",
        description=clean_desc,
        photo_url=photo_reference,
        verification_status="UNVERIFIED",
        review_status="PENDING_REVIEW",
        status="NEW",
        provenance={
            "source_agency": "Citizen Public Report",
            "category": "COMMUNITY",
            "category_th": "รายงานจากประชาชน",
            "category_explanation": "รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "success": True,
        "report_id": new_report.id,
        "tracking_code": new_report.id,
        "status": "UNVERIFIED",
        "public_status": "รับเรื่องแล้ว",
        "message": "ส่งรายงานข้อสังเกตเรียบร้อยแล้ว ข้อมูลจะถูกจัดเก็บเป็นข้อสังเกตจากประชาชน (ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน)",
        "classification": "COMMUNITY",
        "badge": "COMMUNITY",
        "request_id": req_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@public_router.get("/reports/{report_id}/media")
def get_public_report_media(report_id: str, db: Session = Depends(get_db)):
    report = db.query(CitizenReport).filter(
        CitizenReport.id == report_id,
        public_report_predicate(),
    ).first()
    if not report or not report.photo_url:
        raise HTTPException(status_code=404, detail="Media not found")
    try:
        content, media_type = read_private_media(report.photo_url)
    except PrivateMediaUnavailable:
        raise HTTPException(status_code=503, detail="Private media storage unavailable")
    except PrivateMediaNotFound:
        raise HTTPException(status_code=404, detail="Media not found")
    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


# ============================================================
# Section 14 & 15: Public Citizen Report Tracking
# ============================================================

@public_router.get("/reports/track/{report_id}", response_model=Dict[str, Any])
def track_citizen_report_status(report_id: str, db: Session = Depends(get_db)):
    """
    Master Pre-Production Section 14 & 15:
    Public citizen status tracking endpoint by Report ID (e.g. FT-2026-XXXXXX).
    Exposes only public-safe status, category, district, and verification level without leaking PII or exact coordinates.
    """
    clean_id = report_id.strip()
    if clean_id.startswith("obs_"):
        clean_id = clean_id.replace("obs_", "")

    report = db.query(CitizenReport).filter(
        (CitizenReport.id == clean_id) | (CitizenReport.id == report_id)
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="ไม่พบรหัสรายงานข้อสังเกตที่ระบุในระบบ กรุณาตรวจสอบรหัสอ้างอิงอีกครั้ง"
        )

    STATUS_MAP = {
        "NEW": ("รับเรื่องแล้ว", "ระบบได้รับรายงานข้อสังเกตของท่านเรียบร้อยแล้ว รอการคัดกรองเบื้องต้นจากเจ้าหน้าที่"),
        "TRIAGING": ("กำลังคัดกรองเบื้องต้น", "เจ้าหน้าที่กำลังประเมินและคัดกรองข้อมูลเบื้องต้น"),
        "ASSIGNED": ("กำลังตรวจสอบ", "มอบหมายเจ้าหน้าที่รับผิดชอบตรวจสอบข้อเท็จจริงแล้ว"),
        "IN_REVIEW": ("กำลังตรวจสอบ", "เจ้าหน้าที่กำลังตรวจสอบหลักฐานและข้อมูลประกอบ"),
        "NEED_MORE_INFO": ("ขอข้อมูลเพิ่มเติม", "เจ้าหน้าที่ต้องการข้อมูลหรือภาพถ่ายเพิ่มเติมเพื่อประกอบการพิจารณา"),
        "UNDER_VERIFICATION": ("อยู่ระหว่างการตรวจสอบภาคสนาม", "อยู่ระหว่างการลงพื้นที่ตรวจสอบข้อเท็จจริงหรือตรวจสอบพยานหลักฐานประจักษ์"),
        "VERIFIED_OBSERVATION": ("ตรวจสอบข้อสังเกตแล้ว", "เจ้าหน้าที่ตรวจสอบและยืนยันข้อสังเกตทางกายภาพตามที่ได้รับรายงานเรียบร้อยแล้ว"),
        "ESCALATED": ("ส่งต่อเพื่อดำเนินการ", "ส่งต่อข้อมูลไปยังหน่วยงานที่เกี่ยวข้องเพื่อพิจารณาดำเนินการตามอำนาจหน้าที่"),
        "OFFICIAL_CONFIRMED": ("ได้รับการยืนยันอย่างเป็นทางการ", "ได้รับการยืนยันจากหน่วยงานภาครัฐหรือผลตรวจทางห้องปฏิบัติการอย่างเป็นทางการ"),
        "RESOLVED": ("ปิดเรื่อง", "การดำเนินการตรวจสอบเสร็จสิ้นสมบูรณ์"),
        "OUT_OF_SCOPE": ("อยู่นอกพื้นที่วิเคราะห์", "พื้นที่ที่ระบุอยู่นอกขอบเขตการดำเนินงานของโครงการ"),
        "INVALID": ("ปิดเรื่อง (ข้อมูลไม่เข้าข่าย)", "ข้อมูลที่รายงานไม่เข้าข่ายหรือไม่มีหลักฐานเพียงพอ"),
        "DUPLICATE": ("ปิดเรื่อง (รายงานซ้ำซ้อน)", "รายงานนี้เป็นข้อมูลเหตุการณ์ซ้ำซ้อนกับเรื่องที่กำลังดำเนินการอยู่"),
        "SPAM": ("ระงับการดำเนินการ", "รายงานไม่ตรงตามเงื่อนไขการใช้งาน"),
        "WITHDRAWN": ("ยกเลิกคำร้อง", "ผู้รายงานขอถอนเรื่อง"),
    }
    status_th, desc_th = STATUS_MAP.get(report.status, ("ไม่สามารถยืนยันได้", "ไม่สามารถยืนยันสถานะได้"))

    cat = report.category
    if (not cat or cat == "GENERAL") and report.contamination_signs:
        cat = report.contamination_signs[0] if isinstance(report.contamination_signs, list) else str(report.contamination_signs)

    latest_verification = db.query(CitizenReportVerification).filter(
        CitizenReportVerification.report_id == report.id
    ).order_by(CitizenReportVerification.verified_at.desc(), CitizenReportVerification.id.desc()).first()
    verification_status = report.verification_status or "UNVERIFIED"
    latest_verification_valid = bool(
        latest_verification
        and verification_is_valid(
            latest_verification.verification_status,
            latest_verification.structured_assessment,
            latest_verification.verification_method,
            latest_verification.official_source_evidence,
        )
    )
    if (
        latest_verification and not latest_verification_valid
    ) or (
        latest_verification
        and latest_verification.verification_status in {"VERIFIED_OBSERVATION", "OFFICIAL_CONFIRMED"}
        and latest_verification.verification_status != verification_status
    ) or (
        verification_status in {"VERIFIED_OBSERVATION", "OFFICIAL_CONFIRMED"}
        and not latest_verification
    ):
        verification_status = "LEGACY_UNVALIDATED"
    VERIF_MAP = {
        "UNVERIFIED": "รอการตรวจสอบเบื้องต้น (Unverified)",
        "PARTIALLY_VERIFIED": "ตรวจสอบข้อมูลประกอบเบื้องต้นแล้ว (Partially Verified)",
        "VERIFIED_OBSERVATION": "ตรวจสอบข้อสังเกตแล้ว (Verified Observation)",
        "OFFICIAL_CONFIRMED": "ได้รับการยืนยันอย่างเป็นทางการ (Official Confirmed)"
    }
    verif_th = VERIF_MAP.get(verification_status, "ไม่มีข้อมูล")

    return {
        "success": True,
        "report_id": report.id,
        "category": cat or "UNAVAILABLE",
        "district": report.district,
        "subdistrict": report.subdistrict,
        "submitted_at": report.created_at.isoformat() if report.created_at else None,
        "created_at_human": report.created_at.strftime("%d/%m/%Y %H:%M น.") if report.created_at else None,
        "public_status": status_th,
        "public_status_th": status_th,
        "status_description": desc_th,
        "public_description_th": desc_th,
        "verification_level": verification_status,
        "verification_level_th": verif_th,
        "last_updated": (report.updated_at or report.created_at).isoformat() if (report.updated_at or report.created_at) else None
    }
