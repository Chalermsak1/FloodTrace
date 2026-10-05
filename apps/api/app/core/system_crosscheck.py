"""
Ruwaigon System Cross-Check & Environmental Context Engine
Correlates reports with queried water-level and rainfall records. Waterway geometry
stays unavailable until a verified local artifact exists.

Principle:
A nearby sensor reading is SYSTEM CONTEXT, NOT PROOF OF FLOOD OR CONTAMINATION.
Never automatically claim: "Flood confirmed" or "Contamination confirmed".
"""

import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from apps.api.app.models.entities import CitizenReport, WaterStation, RainfallStation
from apps.api.app.core.security import validate_prachin_coordinates

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def build_system_crosscheck_context(db: Session, report: CitizenReport) -> Dict[str, Any]:
    """
    Retrieves and correlates official system telemetry for a citizen report.
    Returns:
    - Nearest water level station (with distance, levels, freshness)
    - Nearest rainfall station (with distance, rain sums, freshness)
    - Waterway status and reason
    - Spatial & temporal related reports
    - Active scope notice
    """
    lat = report.exact_latitude if report.exact_latitude is not None else report.latitude
    lon = report.exact_longitude if report.exact_longitude is not None else report.longitude

    is_inside_prachin = validate_prachin_coordinates(lat, lon)

    # 1. Correlate nearest Water Level Stations
    water_stations = db.query(WaterStation).all()
    nearby_water = []
    for ws in water_stations:
        dist = haversine_distance_km(lat, lon, ws.latitude, ws.longitude)
        if dist <= 35.0: # within 35 km
            nearby_water.append({
                "station_id": ws.id,
                "name_th": ws.name_th,
                "name_en": ws.name_en,
                "district": ws.district,
                "distance_km": round(dist, 2),
                "water_level_msl": ws.water_level_msl,
                "ground_level_msl": ws.ground_level_msl,
                "warning_level_msl": ws.warning_level_msl,
                "critical_level_msl": ws.critical_level_msl,
                "status": ws.status,
                "source_timestamp": ws.provenance.get("original_timestamp") if isinstance(ws.provenance, dict) else None,
                "provenance": ws.provenance
            })
    nearby_water.sort(key=lambda x: x["distance_km"])
    primary_water_station = nearby_water[0] if nearby_water else None

    # 2. Correlate nearest Rainfall Stations
    rain_stations = db.query(RainfallStation).all()
    nearby_rain = []
    for rs in rain_stations:
        dist = haversine_distance_km(lat, lon, rs.latitude, rs.longitude)
        if dist <= 30.0:
            nearby_rain.append({
                "station_id": rs.id,
                "name_th": rs.name_th,
                "district": rs.district,
                "subdistrict": rs.subdistrict,
                "distance_km": round(dist, 2),
                "rain_24h_mm": rs.rain_24h_mm,
                "rain_1h_mm": rs.rain_1h_mm,
                "agency": rs.agency,
                "status": rs.status,
                "observation_time": rs.observation_time,
                "source_timestamp": rs.observation_time,
                "provenance": rs.provenance
            })
    nearby_rain.sort(key=lambda x: x["distance_km"])
    primary_rain_station = nearby_rain[0] if nearby_rain else None

    # No verified local waterway artifact exists; do not infer geography.
    matched_waterways = []

    # 4. Correlate Related Reports (within 5 km radius)
    all_reports = db.query(CitizenReport).filter(CitizenReport.id != report.id).all()
    related_items = []
    for r in all_reports:
        r_lat = r.exact_latitude if r.exact_latitude is not None else r.latitude
        r_lon = r.exact_longitude if r.exact_longitude is not None else r.longitude
        d = haversine_distance_km(lat, lon, r_lat, r_lon)
        if d <= 5.0:
            related_items.append({
                "id": r.id,
                "distance_km": round(d, 2),
                "category": r.category,
                "contamination_signs": r.contamination_signs,
                "status": r.status,
                "verification_status": r.verification_status,
                "created_at": r.created_at.isoformat() if r.created_at else None
            })
    related_items.sort(key=lambda x: x["distance_km"])

    return {
        "report_id": report.id,
        "is_inside_prachinburi": is_inside_prachin,
        "scope_notice": (
            "อยู่ในพื้นที่วิเคราะห์หลัก (จังหวัดปราจีนบุรี)" if is_inside_prachin
            else "อยู่นอกพื้นที่วิเคราะห์หลักของ FloodTrace (อยู่นอกขอบเขตจังหวัดปราจีนบุรี)"
        ),
        "primary_water_station": primary_water_station,
        "nearby_water_stations": nearby_water[:4],
        "primary_rain_station": primary_rain_station,
        "nearby_rain_stations": nearby_rain[:4],
        "correlated_waterways": matched_waterways,
        "waterway_status": "UNAVAILABLE / UNVERIFIED",
        "waterway_reason": "LOCAL_ARTIFACT_ABSENT",
        "related_reports_count": len(related_items),
        "related_reports": related_items[:10],
        "disclaimer": (
            "ข้อมูลระบบประกอบการตรวจสอบเป็นข้อมูลตรวจวัดโทรมาตรและข้อมูลทางภูมิศาสตร์เพื่อสนับสนุนการวินิจฉัยของเจ้าหน้าที่ "
            "ไม่ถือเป็นผลการยืนยันน้ำท่วมหรือการปนเปื้อนทางห้องปฏิบัติการโดยอัตโนมัติ"
        ),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
