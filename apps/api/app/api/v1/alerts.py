from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import WaterStation, IndustrialFacility, Reservoir
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature, VerificationStatus
from datetime import datetime, timezone

router = APIRouter(prefix="/alerts", tags=["Emergency Alerts & Warnings"])

@router.get("/")
def get_active_alerts(db: Session = Depends(get_db)):
    """
    Returns automated real-time alerts combining station telemetry stages
    and industrial waste hazard zones.
    """
    alerts = []
    
    # 1. Critical Water Level Alerts
    critical_stations = db.query(WaterStation).filter(WaterStation.status.in_(["CRITICAL", "WARNING"])).all()
    for st in critical_stations:
        level_diff = round((st.water_level_msl or 0) - (st.ground_level_msl or 0), 2)
        alerts.append({
            "id": f"alt_st_{st.id}",
            "type": "HYDROLOGICAL_FLOOD_STAGE",
            "severity": "CRITICAL" if st.status == "CRITICAL" else "WARNING",
            "title": f"เตือนระดับน้ำวิกฤต: สถานี {st.name_th}",
            "description": f"ระดับน้ำปัจจุบัน {st.water_level_msl} ม.รทก. ({'+' if level_diff>=0 else ''}{level_diff} ม. เทียบตลิ่ง)",
            "location": {"lat": st.latitude, "lon": st.longitude, "district": st.district},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "provenance": st.provenance
        })
        
    # 2. Dam / Reservoir High Capacity Alert
    high_rsv = db.query(Reservoir).filter(Reservoir.storage_percent >= 80.0).all()
    for r in high_rsv:
        alerts.append({
            "id": f"alt_rsv_{r.id}",
            "type": "RESERVOIR_CAPACITY_SURGE",
            "severity": "WARNING",
            "title": f"แจ้งเตือนปริมาณน้ำในอ่าง: {r.name_th}",
            "description": f"ปริมาตรน้ำกักเก็บ {r.storage_percent:.1f}% ({r.storage_mcm:.2f}/{r.capacity_mcm:.2f} ล้าน ลบ.ม.)",
            "location": {"lat": r.latitude, "lon": r.longitude, "district": r.district},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "provenance": r.provenance
        })

    return alerts
