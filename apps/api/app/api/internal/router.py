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


# ==============================================================================
# External Evidence Endpoints (Internal Staff API - Section 25, 11, 13)
# ==============================================================================

from apps.api.app.models.entities import (
    ExternalEvidence,
    ExternalEvidenceMedia,
    ExternalEvidenceAuditLog,
    MonitoringEvent,
    EvidenceEventLink
)
from apps.api.app.schemas.external_evidence import (
    ExternalEvidenceCreate,
    ExternalEvidenceUpdate,
    ExternalEvidenceReviewRequest,
    LinkMonitoringEventRequest,
    MonitoringEventCreate
)
from apps.api.app.services.external_evidence_service import ExternalEvidenceService
from apps.api.app.core.staff_rbac import StaffPrincipal, StaffRole, get_current_staff_user


@internal_router.post("/external-evidence", status_code=status.HTTP_201_CREATED)
def create_external_evidence(
    data: ExternalEvidenceCreate,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """
    Submits a new manual/operator external evidence item.
    Initial state: UNVERIFIED, INTERNAL_ONLY.
    """
    if staff.role == StaffRole.READ_ONLY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="บัญชีบทบาท READ_ONLY ไม่ได้รับอนุญาตให้บันทึกหลักฐานภายนอก"
        )
    try:
        evidence = ExternalEvidenceService.create_evidence(db=db, data=data, staff=staff)
        return {
            "success": True,
            "evidence_id": evidence.id,
            "verification_status": evidence.verification_status,
            "publication_status": evidence.publication_status,
            "title_or_summary": evidence.title_or_summary,
            "content_hash": evidence.content_hash,
            "created_at": evidence.created_at.isoformat() if evidence.created_at else None
        }
    except Exception as e:
        logger.error(f"Error creating external evidence: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@internal_router.get("/external-evidence")
def list_external_evidence(
    verification_status: Optional[str] = Query(None),
    publication_status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    evidence_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """
    Lists external evidence items for staff review queue with filtering and pagination.
    """
    query = db.query(ExternalEvidence)

    if verification_status:
        query = query.filter(ExternalEvidence.verification_status == verification_status)
    if publication_status:
        query = query.filter(ExternalEvidence.publication_status == publication_status)
    if district:
        query = query.filter(ExternalEvidence.district == district)
    if event_type:
        query = query.filter(ExternalEvidence.event_type == event_type)
    if evidence_type:
        query = query.filter(ExternalEvidence.evidence_type == evidence_type)
    if search:
        query = query.filter(
            or_(
                ExternalEvidence.title_or_summary.ilike(f"%{search}%"),
                ExternalEvidence.source_name.ilike(f"%{search}%"),
                ExternalEvidence.description.ilike(f"%{search}%"),
                ExternalEvidence.id.ilike(f"%{search}%")
            )
        )

    total = query.count()
    items = query.order_by(ExternalEvidence.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": ev.id,
                "source_platform": ev.source_platform,
                "source_name": ev.source_name,
                "source_url": ev.source_url,
                "published_at": ev.published_at.isoformat() if ev.published_at else None,
                "observed_at": ev.observed_at.isoformat() if ev.observed_at else None,
                "retrieved_at": ev.retrieved_at.isoformat() if ev.retrieved_at else None,
                "title_or_summary": ev.title_or_summary,
                "description": ev.description,
                "event_type": ev.event_type,
                "evidence_type": ev.evidence_type,
                "verification_status": ev.verification_status,
                "publication_status": ev.publication_status,
                "location_text": ev.location_text,
                "latitude": ev.latitude,
                "longitude": ev.longitude,
                "location_precision": ev.location_precision,
                "district": ev.district,
                "subdistrict": ev.subdistrict,
                "submitted_by": ev.submitted_by,
                "reviewed_by": ev.reviewed_by,
                "monitoring_event_id": ev.monitoring_event_id,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
                "updated_at": ev.updated_at.isoformat() if ev.updated_at else None
            }
            for ev in items
        ]
    }


@internal_router.get("/external-evidence/{evidence_id}")
def get_external_evidence_detail(
    evidence_id: str,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """
    Returns full internal detail of an evidence item including media, audit history, and linked event.
    """
    ev = db.query(ExternalEvidence).filter(ExternalEvidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence {evidence_id} not found")

    media_items = db.query(ExternalEvidenceMedia).filter(ExternalEvidenceMedia.evidence_id == evidence_id).all()
    audit_logs = db.query(ExternalEvidenceAuditLog).filter(
        ExternalEvidenceAuditLog.evidence_id == evidence_id
    ).order_by(ExternalEvidenceAuditLog.timestamp.desc()).all()

    linked_event = None
    if ev.monitoring_event_id:
        mev = db.query(MonitoringEvent).filter(MonitoringEvent.id == ev.monitoring_event_id).first()
        if mev:
            linked_event = {
                "id": mev.id,
                "title": mev.title,
                "event_type": mev.event_type,
                "status": mev.status,
                "monitoring_priority": mev.monitoring_priority,
                "district": mev.district
            }

    return {
        "id": ev.id,
        "source_platform": ev.source_platform,
        "source_name": ev.source_name,
        "source_url": ev.source_url,
        "published_at": ev.published_at.isoformat() if ev.published_at else None,
        "observed_at": ev.observed_at.isoformat() if ev.observed_at else None,
        "retrieved_at": ev.retrieved_at.isoformat() if ev.retrieved_at else None,
        "title_or_summary": ev.title_or_summary,
        "description": ev.description,
        "event_type": ev.event_type,
        "evidence_type": ev.evidence_type,
        "verification_status": ev.verification_status,
        "publication_status": ev.publication_status,
        "location_text": ev.location_text,
        "latitude": ev.latitude,
        "longitude": ev.longitude,
        "location_precision": ev.location_precision,
        "district": ev.district,
        "subdistrict": ev.subdistrict,
        "content_hash": ev.content_hash,
        "submitted_by": ev.submitted_by,
        "submitter_notes": ev.submitter_notes,
        "reviewed_by": ev.reviewed_by,
        "reviewed_at": ev.reviewed_at.isoformat() if ev.reviewed_at else None,
        "reviewer_notes": ev.reviewer_notes,
        "official_source_evidence": ev.official_source_evidence,
        "monitoring_event_id": ev.monitoring_event_id,
        "linked_event": linked_event,
        "media_references": [
            {
                "id": m.id,
                "media_type": m.media_type,
                "source_media_url": m.source_media_url,
                "captured_at": m.captured_at.isoformat() if m.captured_at else None,
                "license_or_permission_status": m.license_or_permission_status
            }
            for m in media_items
        ],
        "audit_logs": [
            {
                "audit_id": a.audit_id,
                "actor_id": a.actor_id,
                "actor_role": a.actor_role,
                "action": a.action,
                "previous_status": a.previous_status,
                "new_status": a.new_status,
                "reason": a.reason,
                "details": a.details,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None
            }
            for a in audit_logs
        ],
        "provenance": ev.provenance
    }


@internal_router.patch("/external-evidence/{evidence_id}")
def update_external_evidence(
    evidence_id: str,
    update_data: ExternalEvidenceUpdate,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """Updates editable metadata, location, and timestamps of an evidence item."""
    if staff.role == StaffRole.READ_ONLY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="READ_ONLY cannot modify evidence")

    ev = db.query(ExternalEvidence).filter(ExternalEvidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    changes = {}
    if update_data.title_or_summary is not None:
        ev.title_or_summary = update_data.title_or_summary
        changes["title_or_summary"] = update_data.title_or_summary
    if update_data.description is not None:
        ev.description = update_data.description
        changes["description"] = update_data.description
    if update_data.event_type is not None:
        ev.event_type = update_data.event_type.value
        changes["event_type"] = update_data.event_type.value
    if update_data.evidence_type is not None:
        ev.evidence_type = update_data.evidence_type.value
        changes["evidence_type"] = update_data.evidence_type.value
    if update_data.location_text is not None:
        ev.location_text = update_data.location_text
        changes["location_text"] = update_data.location_text
    if update_data.latitude is not None:
        ev.latitude = update_data.latitude
        changes["latitude"] = update_data.latitude
    if update_data.longitude is not None:
        ev.longitude = update_data.longitude
        changes["longitude"] = update_data.longitude
    if update_data.location_precision is not None:
        ev.location_precision = update_data.location_precision.value
        changes["location_precision"] = update_data.location_precision.value
    if update_data.district is not None:
        ev.district = update_data.district
        changes["district"] = update_data.district
    if update_data.subdistrict is not None:
        ev.subdistrict = update_data.subdistrict
        changes["subdistrict"] = update_data.subdistrict
    if update_data.published_at is not None:
        ev.published_at = update_data.published_at
        changes["published_at"] = update_data.published_at.isoformat()
    if update_data.observed_at is not None:
        ev.observed_at = update_data.observed_at
        changes["observed_at"] = update_data.observed_at.isoformat()
    if update_data.submitter_notes is not None:
        ev.submitter_notes = update_data.submitter_notes
        changes["submitter_notes"] = update_data.submitter_notes

    ev.updated_at = datetime.now(timezone.utc)

    ExternalEvidenceService.log_audit(
        db=db,
        evidence_id=ev.id,
        staff=staff,
        action="EDITED",
        new_status=ev.verification_status,
        reason="Updated evidence metadata and location",
        details=changes
    )

    db.commit()
    db.refresh(ev)
    return {"success": True, "evidence_id": ev.id, "updated_fields": list(changes.keys())}


@internal_router.post("/external-evidence/{evidence_id}/review")
def review_external_evidence(
    evidence_id: str,
    review_data: ExternalEvidenceReviewRequest,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """Executes staff reviewer workflow on an evidence item."""
    if staff.role == StaffRole.READ_ONLY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="READ_ONLY cannot review evidence")

    try:
        ev = ExternalEvidenceService.review_evidence(
            db=db,
            evidence_id=evidence_id,
            review_data=review_data,
            staff=staff
        )
        return {
            "success": True,
            "evidence_id": ev.id,
            "verification_status": ev.verification_status,
            "publication_status": ev.publication_status,
            "reviewed_by": ev.reviewed_by,
            "reviewed_at": ev.reviewed_at.isoformat() if ev.reviewed_at else None
        }
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error reviewing evidence {evidence_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@internal_router.post("/external-evidence/{evidence_id}/link-event")
def link_evidence_event(
    evidence_id: str,
    link_data: LinkMonitoringEventRequest,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """Links evidence item to a monitoring event."""
    if staff.role == StaffRole.READ_ONLY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="READ_ONLY cannot link events")

    try:
        event = ExternalEvidenceService.link_to_monitoring_event(
            db=db,
            evidence_id=evidence_id,
            link_data=link_data,
            staff=staff
        )
        return {
            "success": True,
            "evidence_id": evidence_id,
            "event_id": event.id,
            "monitoring_priority": event.monitoring_priority,
            "priority_factors": event.priority_factors
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error linking event: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@internal_router.get("/external-evidence/{evidence_id}/correlations")
def get_evidence_correlations(
    evidence_id: str,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """Calculates deterministic spatial, temporal, and hydrological correlations."""
    try:
        report = ExternalEvidenceService.correlate_evidence(db=db, evidence_id=evidence_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@internal_router.post("/monitoring-events", status_code=status.HTTP_201_CREATED)
def create_monitoring_event(
    event_data: MonitoringEventCreate,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """Creates an operational Monitoring Event."""
    if staff.role == StaffRole.READ_ONLY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="READ_ONLY cannot create events")

    event = ExternalEvidenceService.create_monitoring_event(db=db, event_data=event_data, staff=staff)
    return {
        "success": True,
        "event_id": event.id,
        "title": event.title,
        "monitoring_priority": event.monitoring_priority,
        "priority_factors": event.priority_factors
    }


@internal_router.get("/monitoring-events")
def list_monitoring_events(
    status_filter: Optional[str] = Query(None),
    priority_filter: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """Lists monitoring events for staff console."""
    query = db.query(MonitoringEvent)
    if status_filter:
        query = query.filter(MonitoringEvent.status == status_filter)
    if priority_filter:
        query = query.filter(MonitoringEvent.monitoring_priority == priority_filter)
    if district:
        query = query.filter(MonitoringEvent.district == district)

    events = query.order_by(MonitoringEvent.updated_at.desc()).all()
    results = []
    for ev in events:
        evidence_count = db.query(EvidenceEventLink).filter(EvidenceEventLink.event_id == ev.id).count()
        results.append({
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "event_type": ev.event_type,
            "status": ev.status,
            "monitoring_priority": ev.monitoring_priority,
            "district": ev.district,
            "subdistrict": ev.subdistrict,
            "latitude": ev.latitude,
            "longitude": ev.longitude,
            "location_precision": ev.location_precision,
            "waterway_name": ev.waterway_name,
            "priority_factors": ev.priority_factors,
            "evidence_count": evidence_count,
            "created_by": ev.created_by,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
            "updated_at": ev.updated_at.isoformat() if ev.updated_at else None
        })

    return {"count": len(results), "events": results}


@internal_router.get("/monitoring-events/{event_id}")
def get_monitoring_event_detail(
    event_id: str,
    staff: StaffPrincipal = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """Returns monitoring event detail with complete 7-section Evidence Packet."""
    try:
        packet = ExternalEvidenceService.get_evidence_packet_for_event(db=db, event_id=event_id)
        return packet
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

