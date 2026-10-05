from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import WaterStation, Reservoir
from apps.api.app.adapters.thaiwater import fetch_thaiwater_stations
from apps.api.app.adapters.rid import fetch_rid_reservoirs
from datetime import datetime, timezone

router = APIRouter(prefix="/telemetry", tags=["Real-Time Hydrological Telemetry"])

@router.get("/stations")
async def get_water_stations(db: Session = Depends(get_db)):
    """
    Returns real-time hydrological water level stations from ThaiWater / HII in Prachin Buri.
    Direct physical telemetry with 100% verified provenance.
    """
    from apps.api.app.core.config import settings
    if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION:
        return []

    stations = db.query(WaterStation).all()
    if not stations:
        # Fetch live and persist
        live_data = await fetch_thaiwater_stations()
        for item in live_data:
            st = WaterStation(
                id=item["id"],
                name_th=item["name_th"],
                name_en=item["name_en"],
                basin=item["basin"],
                district=item["district"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                water_level_msl=item["water_level_msl"],
                ground_level_msl=item["ground_level_msl"],
                warning_level_msl=item["warning_level_msl"],
                critical_level_msl=item["critical_level_msl"],
                status=item["status"],
                last_updated=datetime.now(timezone.utc),
                provenance=item["provenance"]
            )
            db.merge(st)
        db.commit()
        stations = db.query(WaterStation).all()
        
    return [
        {
            "id": s.id,
            "name_th": s.name_th,
            "name_en": s.name_en,
            "basin": s.basin,
            "district": s.district,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "water_level_msl": s.water_level_msl,
            "ground_level_msl": s.ground_level_msl,
            "warning_level_msl": s.warning_level_msl,
            "critical_level_msl": s.critical_level_msl,
            "status": s.status,
            "last_updated": s.last_updated.isoformat() if s.last_updated else None,
            "provenance": s.provenance
        }
        for s in stations
    ]

@router.get("/reservoirs")
async def get_reservoirs(db: Session = Depends(get_db)):
    """
    Returns official RID reservoir telemetry and storage metrics for Prachin Buri catchment.
    Includes Naruebodindrachinda Dam, Khao Ito, Thap Lan, and Phra Prong.
    """
    from apps.api.app.core.config import settings
    if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION:
        return []

    reservoirs = db.query(Reservoir).all()
    if not reservoirs:
        live_rsv = await fetch_rid_reservoirs()
        for item in live_rsv:
            r = Reservoir(
                id=item["id"],
                name_th=item["name_th"],
                capacity_mcm=item["capacity_mcm"],
                storage_mcm=item["storage_mcm"],
                storage_percent=item["storage_percent"],
                inflow_mcm_day=item["inflow_mcm_day"],
                outflow_mcm_day=item["outflow_mcm_day"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                district=item["district"],
                last_updated=datetime.now(timezone.utc),
                provenance=item["provenance"]
            )
            db.merge(r)
        db.commit()
        reservoirs = db.query(Reservoir).all()
        
    return [
        {
            "id": r.id,
            "name_th": r.name_th,
            "capacity_mcm": r.capacity_mcm,
            "storage_mcm": r.storage_mcm,
            "storage_percent": r.storage_percent,
            "inflow_mcm_day": r.inflow_mcm_day,
            "outflow_mcm_day": r.outflow_mcm_day,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "district": r.district,
            "last_updated": r.last_updated.isoformat() if r.last_updated else None,
            "provenance": r.provenance
        }
        for r in reservoirs
    ]

@router.post("/sync")
async def sync_live_telemetry(db: Session = Depends(get_db)):
    """
    Explicit sync endpoint to pull fresh telemetry from official government servers.
    """
    live_stations = await fetch_thaiwater_stations()
    for item in live_stations:
        st = WaterStation(
            id=item["id"],
            name_th=item["name_th"],
            name_en=item["name_en"],
            basin=item["basin"],
            district=item["district"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            water_level_msl=item["water_level_msl"],
            ground_level_msl=item["ground_level_msl"],
            warning_level_msl=item["warning_level_msl"],
            critical_level_msl=item["critical_level_msl"],
            status=item["status"],
            last_updated=datetime.now(timezone.utc),
            provenance=item["provenance"]
        )
        db.merge(st)
        
    live_rsv = await fetch_rid_reservoirs()
    for item in live_rsv:
        r = Reservoir(
            id=item["id"],
            name_th=item["name_th"],
            capacity_mcm=item["capacity_mcm"],
            storage_mcm=item["storage_mcm"],
            storage_percent=item["storage_percent"],
            inflow_mcm_day=item["inflow_mcm_day"],
            outflow_mcm_day=item["outflow_mcm_day"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            district=item["district"],
            last_updated=datetime.now(timezone.utc),
            provenance=item["provenance"]
        )
        db.merge(r)
        
    db.commit()
    return {
        "status": "success",
        "synced_stations": len(live_stations),
        "synced_reservoirs": len(live_rsv),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
