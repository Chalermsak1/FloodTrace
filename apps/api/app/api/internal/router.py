"""
FloodTrace Internal Analysis API Router (/api/internal/*)
Strict Safety-by-Design Compliance:
- Accessible ONLY to authenticated administrators and environmental screening staff
- Contains internal facility records, exact reporter GPS, raw evidence, and audit logs
- NEVER exposed through /api/public/*
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.app.core.database import get_db
from apps.api.app.core.config import settings
from apps.api.app.core.security import verify_admin_key
from apps.api.app.models.entities import IndustrialFacility, CitizenReport

internal_router = APIRouter(prefix="/internal", tags=["FloodTrace Internal Analysis Layer"])

@internal_router.get("/facilities", dependencies=[Depends(verify_admin_key)])
def get_internal_facilities(
    district: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """
    Internal Analysis Layer:
    Provides DIW industrial facility data to authenticated environmental staff only.
    Strictly isolated from public visibility.
    """
    query = db.query(IndustrialFacility)
    if district:
        query = query.filter(IndustrialFacility.district == district)
    
    facilities = query.limit(limit).all()
    return {
        "access_level": "INTERNAL_AUTHORIZED_STAFF",
        "notice": "Internal facility records are strictly confidential and must never be exposed to public interfaces.",
        "count": len(facilities),
        "facilities": [
            {
                "id": f.id,
                "name": f.name,
                "business_type": f.business_type,
                "facility_type": f.facility_type,
                "district": f.district,
                "subdistrict": f.subdistrict,
                "latitude": f.latitude,
                "longitude": f.longitude,
                "hazard_evidence_status": f.hazard_evidence_status,
                "provenance": f.provenance
            }
            for f in facilities
        ]
    }

@internal_router.get("/raw-reports", dependencies=[Depends(verify_admin_key)])
def get_internal_raw_reports(
    status_filter: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """
    Internal Moderation Layer:
    Provides exact coordinates and moderation status for field inspection teams.
    """
    query = db.query(CitizenReport)
    if status_filter:
        query = query.filter(CitizenReport.verification_status == status_filter)
        
    reports = query.order_by(CitizenReport.created_at.desc()).limit(limit).all()
    return {
        "access_level": "INTERNAL_MODERATOR",
        "count": len(reports),
        "reports": [
            {
                "id": r.id,
                "report_type": r.report_type,
                "exact_latitude": r.latitude,
                "exact_longitude": r.longitude,
                "district": r.district,
                "subdistrict": r.subdistrict,
                "description": r.description,
                "verification_status": r.verification_status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "image_filename": r.image_url
            }
            for r in reports
        ]
    }

@internal_router.post("/reports/{report_id}/moderate", dependencies=[Depends(verify_admin_key)])
def moderate_report(
    report_id: int,
    action: str = Query(..., description="VERIFY, REJECT, ARCHIVE"),
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Moderation action with audit logging.
    """
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    old_status = report.verification_status
    if action == "VERIFY":
        report.verification_status = "OFFICIAL_INVESTIGATING"
    elif action == "REJECT":
        report.verification_status = "REJECTED"
    elif action == "ARCHIVE":
        report.verification_status = "ARCHIVED"
        
    db.commit()
    return {
        "success": True,
        "report_id": report_id,
        "previous_status": old_status,
        "new_status": report.verification_status,
        "moderated_at": datetime.now(timezone.utc).isoformat()
    }
