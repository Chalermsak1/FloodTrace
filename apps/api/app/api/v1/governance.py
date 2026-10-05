import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.database import get_db
from apps.api.app.core.staff_rbac import StaffPrincipal, require_permission
from apps.api.app.core.safety_policy import PUBLIC_METHODOLOGY_DISCLAIMER
from apps.api.app.models.entities import ClaimPublication, TakedownRequest, SecurityAuditLog

router = APIRouter(prefix="/governance", tags=["Project Governance & Public Safety"])

class ProjectMetadataResponse(BaseModel):
    project_name: str
    project_owner: str
    institution: str
    advisor: str
    public_contact: str
    privacy_contact: str
    security_contact: str
    legal_contact: str
    governance_notice: str

class TakedownRequestCreate(BaseModel):
    request_type: str = Field(..., description="FACTUAL_CORRECTION, DATA_SOURCE_CHALLENGE, PRIVACY_REQUEST, REMOVAL_REQUEST, SECURITY_REPORT, ABUSIVE_CONTENT")
    target_id: str = Field(..., description="Target claim_id, report_id, or facility license")
    target_type: str = Field(..., description="CLAIM, REPORT, FACILITY, STATION")
    requester_contact: str = Field(..., description="Email address or official contact")
    request_description: str = Field(..., description="Detailed description of correction or challenge grounds")

@router.get("/project-info", response_model=ProjectMetadataResponse)
def get_project_metadata():
    """
    Section 1 Project Governance:
    Returns configurable project metadata. Unconfirmed affiliations/contacts
    explicitly return 'NOT DESIGNATED' or 'NOT DISCLOSED' without inventing credentials.
    """
    return ProjectMetadataResponse(
        project_name=settings.PROJECT_NAME,
        project_owner=settings.PROJECT_OWNER,
        institution=settings.INSTITUTION,
        advisor=settings.ADVISOR,
        public_contact=settings.PUBLIC_CONTACT,
        privacy_contact=settings.PRIVACY_CONTACT,
        security_contact=settings.SECURITY_CONTACT,
        legal_contact=settings.LEGAL_CONTACT,
        governance_notice=(
            "FloodTrace operates under strict evidence-based governance. "
            "No university ownership, research affiliation, government endorsement, "
            "or institutional sponsorship is claimed unless officially authorized."
        )
    )

@router.get("/disclaimer")
def get_public_methodology_disclaimer():
    """
    Section 23 Public Disclaimer:
    Concise methodology notice clearly separating records, measurements, and models.
    """
    return {
        "title": "Public Methodology & Data Integrity Disclaimer",
        "disclaimer_text": PUBLIC_METHODOLOGY_DISCLAIMER,
        "effective_date": "2026-10-02"
    }

@router.get("/claims")
def get_public_published_claims(
    claim_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Section 2 & 13:
    Returns only claims that have reached APPROVED and PUBLISHED state.
    DRAFT, HUMAN_REVIEW, REJECTED, and WITHDRAWN claims are NEVER exposed.
    """
    query = db.query(ClaimPublication).filter(ClaimPublication.publication_status == "PUBLISHED")
    if claim_type:
        query = query.filter(ClaimPublication.claim_type == claim_type)
        
    claims = query.order_by(ClaimPublication.created_at.desc()).all()
    
    return [
        {
            "claim_id": c.claim_id,
            "claim_text": c.claim_text,
            "claim_type": c.claim_type,
            "category": c.category,
            "source_ids": c.source_ids,
            "evidence_ids": c.evidence_ids,
            "data_version": c.data_version,
            "model_version": c.model_version,
            "methodology_version": c.methodology_version,
            "publication_status": c.publication_status,
            "version": c.version,
            "correction_status": c.correction_status,
            "reviewer": c.reviewer,
            "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "provenance": c.provenance
        }
        for c in claims
    ]

@router.post("/takedown")
def submit_takedown_or_correction_request(
    data: TakedownRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Section 14 Notice & Takedown Workflow:
    Accepts structured requests for factual correction, source challenge,
    privacy redaction, or security reports.
    NOTE: Verified government records are never automatically deleted without human review.
    """
    valid_types = [
        "FACTUAL_CORRECTION", "DATA_SOURCE_CHALLENGE", 
        "PRIVACY_REQUEST", "REMOVAL_REQUEST", 
        "SECURITY_REPORT", "ABUSIVE_CONTENT"
    ]
    if data.request_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request_type. Must be one of: {', '.join(valid_types)}"
        )

    req_id = f"req_{uuid.uuid4().hex[:10]}"
    takedown = TakedownRequest(
        request_id=req_id,
        request_type=data.request_type,
        target_id=data.target_id,
        target_type=data.target_type,
        requester_contact=data.requester_contact,
        request_description=data.request_description,
        status="RECEIVED",
        received_at=datetime.now(timezone.utc)
    )
    
    # Audit log entry
    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="NOTICE_AND_TAKEDOWN_SUBMITTED",
        user_or_system=f"requester:{data.requester_contact[:3]}***",
        details={
            "request_id": req_id,
            "request_type": data.request_type,
            "target_id": data.target_id,
            "target_type": data.target_type
        },
        timestamp=datetime.now(timezone.utc)
    )
    
    db.add(takedown)
    db.add(audit)
    db.commit()
    
    return {
        "status": "RECEIVED",
        "request_id": req_id,
        "message": (
            "Your notice/request has been recorded and queued for formal human review. "
            "Verified government source records are not automatically deleted without investigative due diligence."
        ),
        "received_at": takedown.received_at.isoformat()
    }

@router.get("/source-access")
def list_source_access_matrix(
    enforce_private: bool = Query(True, description="Enforce strict private-only production requirement")
):
    """
    Master Prompt Section 5 & 50:
    Data Source Access Report and Matrix.
    Evaluates all 15 candidate sources against private-access rules,
    licensing, raw storage permissions, and production ingestion status.
    """
    from apps.api.app.core.source_access import get_all_source_access_evaluations
    records = get_all_source_access_evaluations(enforce_private_production=enforce_private)
    return [r.model_dump() for r in records]

@router.get("/source-access/{source_id}")
def get_source_access_detail(
    source_id: str,
    enforce_private: bool = Query(True, description="Enforce strict private-only production requirement")
):
    """
    Evaluates a specific candidate source against the Source Access Decision Engine (Section 7).
    """
    from apps.api.app.core.source_access import evaluate_source_access
    record = evaluate_source_access(source_id, enforce_private_production=enforce_private)
    return record.model_dump()


class ModeSwitchRequest(BaseModel):
    mode: str  # "DEVELOPMENT" or "PRODUCTION"


@router.get("/mode")
def get_system_mode():
    """Return the current governance mode without exposing operational details."""
    current_mode = "PRODUCTION" if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION else "DEVELOPMENT"
    return {"mode": current_mode}


@router.post("/mode")
async def toggle_system_mode(
    payload: ModeSwitchRequest,
    staff: StaffPrincipal = Depends(require_permission("modify_workflow")),
    db: Session = Depends(get_db),
):
    """
    Toggles between DEVELOPMENT (Real Data Testing) and PRODUCTION (Strict Fail-Closed Isolation).
    """
    target = payload.mode.upper()
    if target not in ["DEVELOPMENT", "PRODUCTION"]:
        raise HTTPException(status_code=400, detail="Mode must be 'DEVELOPMENT' or 'PRODUCTION'")
    
    from apps.api.app.models.entities import IndustrialFacility, WaterStation, Reservoir
    
    if target == "DEVELOPMENT":
        settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = False
        settings.DATA_ENV = "DEVELOPMENT"
        
        from apps.api.app.adapters.diw import load_diw_facilities
        from apps.api.app.adapters.thaiwater import fetch_thaiwater_stations
        from apps.api.app.adapters.rid import fetch_rid_reservoirs
        
        diw_items = load_diw_facilities()
        for item in diw_items:
            f = IndustrialFacility(
                id=item["id"],
                fid=item.get("fid"),
                name=item["name"],
                business_type=item["business_type"],
                facility_type=item["facility_type"],
                official_activity_category=item.get("official_activity_category"),
                address=item.get("address"),
                subdistrict=item["subdistrict"],
                district=item["district"],
                province=item.get("province", "ปราจีนบุรี"),
                latitude=item["latitude"],
                longitude=item["longitude"],
                horsepower=item.get("horsepower", 0.0),
                workers=item.get("workers", 0),
                capital=item.get("capital", 0.0),
                official_licensed_capacity=item.get("official_licensed_capacity"),
                hazard_evidence_status=item.get("hazard_evidence_status", "INSUFFICIENT_DATA"),
                hazard_classification=item.get("hazard_classification", "NOT_AVAILABLE_IN_REGISTRY"),
                chemical_assay_evidence=item.get("chemical_assay_evidence", "INSUFFICIENT_DATA — No chemical lab assays published in DIW registry"),
                environmental_inspection_evidence=item.get("environmental_inspection_evidence", "INSUFFICIENT_DATA — No PCD inspection violations reported in registry"),
                provenance=item["provenance"]
            )
            db.merge(f)
            
        stations = await fetch_thaiwater_stations()
        for item in stations:
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
                provenance=item["provenance"]
            )
            db.merge(st)
            
        reservoirs = await fetch_rid_reservoirs()
        for item in reservoirs:
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
                provenance=item["provenance"]
            )
            db.merge(r)
            
        db.commit()
        return {
            "status": "SUCCESS",
            "mode": "DEVELOPMENT",
            "message": "Switched to Research & Testing Mode. Real official data active.",
            "counts": {
                "facilities": len(diw_items),
                "stations": len(stations),
                "reservoirs": len(reservoirs)
            }
        }
    else:
        settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True
        settings.DATA_ENV = "PRODUCTION"
        db.query(IndustrialFacility).delete()
        db.query(WaterStation).delete()
        db.query(Reservoir).delete()
        db.commit()
        return {
            "status": "SUCCESS",
            "mode": "PRODUCTION",
            "message": "Switched to Strict Production Audit Mode. External sources fail-closed.",
            "counts": {
                "facilities": 0,
                "stations": 0,
                "reservoirs": 0
            }
        }
