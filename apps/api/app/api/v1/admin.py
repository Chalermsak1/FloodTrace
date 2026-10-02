import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from apps.api.app.core.database import get_db
from apps.api.app.core.security import verify_admin_key
from apps.api.app.core.safety_policy import (
    validate_claim_text,
    check_requires_human_approval,
    validate_evidence_bundle,
    ClaimType,
    InformationClassification,
    PublicationStatus,
)
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature
from apps.api.app.models.entities import (
    ClaimPublication,
    CorrectionRecord,
    TakedownRequest,
    SecurityAuditLog,
    CitizenReport,
)

router = APIRouter(prefix="/admin", tags=["Administrative & Moderation Gateway"], dependencies=[Depends(verify_admin_key)])

class ClaimCreate(BaseModel):
    claim_text: str = Field(..., description="Objective environmental statement")
    claim_type: ClaimType = Field(..., description="Claim category")
    category: InformationClassification = Field(..., description="Exact information classification")
    source_ids: List[str] = Field(..., min_length=1, description="Official source catalog or portal IDs")
    evidence_ids: List[str] = Field(..., min_length=1, description="Specific telemetry or assay evidence IDs")
    source_timestamp: Optional[datetime] = None
    data_version: str = "v1.0"
    model_version: str = "v2.0-Audit"
    methodology_version: str = "MCE-2026-v1"
    mentions_facility_or_person: bool = False

class ClaimReviewDecision(BaseModel):
    decision: str = Field(..., description="APPROVE or REJECT")
    reviewer: str = Field(..., description="Designated human reviewer name/ID")
    notes: Optional[str] = None

class ClaimCorrection(BaseModel):
    new_claim_text: str = Field(..., description="Corrected text")
    reason: str = Field(..., description="Factual justification for correction")
    reviewer: str = Field(..., description="Designated reviewer approving the correction")
    new_evidence_ids: Optional[List[str]] = None

class TakedownDecision(BaseModel):
    decision: str = Field(..., description="APPROVED_REMOVAL, APPROVED_CORRECTION, REJECTED_OFFICIAL_RECORD, NO_ACTION")
    reviewer: str = Field(..., description="Reviewer name/ID")
    reason: str = Field(..., description="Detailed rationale")

class CitizenReportReview(BaseModel):
    verification_status: str = Field(..., description="UNDER_REVIEW, VERIFIED, REJECTED")
    reviewer: str = Field(..., description="Official inspector or moderator identifier")
    notes: Optional[str] = None

@router.post("/claims/submit")
def submit_claim(data: ClaimCreate, db: Session = Depends(get_db)):
    """
    Submits a new claim into the formal publication pipeline.
    Enforces automated safety validation:
    1. Prohibits defamatory / accusatory language.
    2. Validates evidence bundle.
    3. Mandates HUMAN_REVIEW for sensitive claims.
    """
    # 1. Linguistic safety validation
    is_valid, violations = validate_claim_text(data.claim_text)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "SAFETY_POLICY_VIOLATION", "violations": violations}
        )

    # 2. Check if human approval is mandatory
    requires_approval = check_requires_human_approval(
        data.claim_type, data.claim_text, data.mentions_facility_or_person
    )

    claim_id = f"clm_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    source_ts = data.source_timestamp or now
    
    # 3. Evidence bundle validation
    evidence_bundle = {
        "claim_id": claim_id,
        "claim_text": data.claim_text,
        "claim_type": data.claim_type.value,
        "source_ids": data.source_ids,
        "evidence_ids": data.evidence_ids,
        "source_timestamp": source_ts,
        "retrieved_at": now,
        "data_version": data.data_version,
        "model_version": data.model_version,
        "methodology_version": data.methodology_version,
        "review_status": "PENDING_HUMAN_REVIEW" if requires_approval else "AUTOMATED_VALIDATION_PASSED",
        "publication_status": "HUMAN_REVIEW" if requires_approval else "DRAFT"
    }
    
    bundle_ok, bundle_errors = validate_evidence_bundle(evidence_bundle)
    if not bundle_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INCOMPLETE_EVIDENCE_BUNDLE", "errors": bundle_errors}
        )

    prov = make_provenance(
        agency="FloodTrace Editorial Governance Board",
        dataset="Evidence-Backed Environmental Claims Register",
        official_id=claim_id,
        category=DataCategory.OFFICIAL_RECORD if data.category.value == "OFFICIAL_RECORD" else DataCategory.DERIVED,
        source_verification=SourceVerification.VERIFIED_OFFICIAL,
        measurement_status="EVIDENCE_BUNDLE_AUDITED",
        value_nature=ValueNature.RECORDED,
        audit_notes=f"Claim submitted under policy v2.0. Requires human approval: {requires_approval}."
    )

    claim = ClaimPublication(
        claim_id=claim_id,
        claim_text=data.claim_text,
        claim_type=data.claim_type.value,
        category=data.category.value,
        source_ids=data.source_ids,
        evidence_ids=data.evidence_ids,
        source_timestamp=source_ts,
        retrieved_at=now,
        data_version=data.data_version,
        model_version=data.model_version,
        methodology_version=data.methodology_version,
        publication_status="HUMAN_REVIEW" if requires_approval else "DRAFT",
        requires_human_approval=requires_approval,
        version=1,
        correction_status="ORIGINAL",
        provenance=prov.to_dict(),
        created_at=now,
        updated_at=now
    )
    
    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="CLAIM_SUBMITTED",
        user_or_system="admin_operator",
        details={"claim_id": claim_id, "requires_approval": requires_approval, "status": claim.publication_status},
        timestamp=now
    )

    db.add(claim)
    db.add(audit)
    db.commit()
    db.refresh(claim)

    return {
        "status": "success",
        "claim_id": claim.claim_id,
        "publication_status": claim.publication_status,
        "requires_human_approval": claim.requires_human_approval,
        "message": "Claim logged into publication workflow."
    }

@router.post("/claims/{claim_id}/review")
def review_claim(claim_id: str, decision: ClaimReviewDecision, db: Session = Depends(get_db)):
    """
    Section 2: Human Review Gate.
    A human reviewer formally APPROVES or REJECTS a sensitive claim.
    """
    claim = db.query(ClaimPublication).filter(ClaimPublication.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    now = datetime.now(timezone.utc)
    if decision.decision == "APPROVE":
        claim.publication_status = "APPROVED"
        claim.reviewer = decision.reviewer
        claim.reviewed_at = now
        claim.review_notes = decision.notes
    elif decision.decision == "REJECT":
        claim.publication_status = "REJECTED"
        claim.reviewer = decision.reviewer
        claim.reviewed_at = now
        claim.review_notes = decision.notes
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decision must be APPROVE or REJECT.")

    claim.updated_at = now
    
    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="CLAIM_REVIEWED",
        user_or_system=decision.reviewer,
        details={"claim_id": claim_id, "decision": decision.decision, "notes": decision.notes},
        timestamp=now
    )

    db.add(audit)
    db.commit()

    return {
        "claim_id": claim.claim_id,
        "publication_status": claim.publication_status,
        "reviewer": claim.reviewer,
        "reviewed_at": claim.reviewed_at.isoformat()
    }

@router.post("/claims/{claim_id}/publish")
def publish_claim(claim_id: str, reviewer: str = Query(..., description="Publishing operator"), db: Session = Depends(get_db)):
    """
    Section 2 & 3:
    Publishes an APPROVED claim.
    No sensitive claim may become public directly from model/AI output without APPROVED state.
    Cannot be published if required evidence bundle is missing.
    """
    claim = db.query(ClaimPublication).filter(ClaimPublication.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    if claim.publication_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish claim with status '{claim.publication_status}'. Claim must be in 'APPROVED' state."
        )

    # Re-verify evidence bundle
    if not claim.source_ids or not claim.evidence_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish claim: required evidence bundle is incomplete."
        )

    now = datetime.now(timezone.utc)
    claim.publication_status = "PUBLISHED"
    claim.updated_at = now

    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="CLAIM_PUBLISHED",
        user_or_system=reviewer,
        details={"claim_id": claim_id, "version": claim.version},
        timestamp=now
    )

    db.add(audit)
    db.commit()

    return {
        "claim_id": claim.claim_id,
        "publication_status": claim.publication_status,
        "published_at": claim.updated_at.isoformat()
    }

@router.post("/claims/{claim_id}/correct")
def correct_claim(claim_id: str, data: ClaimCorrection, db: Session = Depends(get_db)):
    """
    Section 13 Correction System:
    Never silently overwrites material public claims.
    Creates a new version (e.g. v2) and creates an immutable CorrectionRecord.
    """
    original = db.query(ClaimPublication).filter(ClaimPublication.claim_id == claim_id).first()
    if not original:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    # Validate new claim text
    is_valid, violations = validate_claim_text(data.new_claim_text)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "SAFETY_POLICY_VIOLATION", "violations": violations}
        )

    now = datetime.now(timezone.utc)
    new_claim_id = f"{original.claim_id}_v{original.version + 1}"

    # Record correction in audit log
    correction = CorrectionRecord(
        id=f"cor_{uuid.uuid4().hex[:10]}",
        claim_id=original.claim_id,
        action_type="CORRECT",
        original_version=original.version,
        corrected_version=original.version + 1,
        reason=data.reason,
        changed_by=data.reviewer,
        changed_at=now,
        evidence_ids=data.new_evidence_ids or original.evidence_ids,
        reviewer=data.reviewer
    )

    # Supersede original
    original.correction_status = "SUPERSEDED"
    original.publication_status = "CORRECTED"
    original.superseded_by = new_claim_id
    original.updated_at = now

    # Create new corrected version
    new_claim = ClaimPublication(
        claim_id=new_claim_id,
        claim_text=data.new_claim_text,
        claim_type=original.claim_type,
        category=original.category,
        source_ids=original.source_ids,
        evidence_ids=data.new_evidence_ids or original.evidence_ids,
        source_timestamp=original.source_timestamp,
        retrieved_at=now,
        data_version=original.data_version,
        model_version=original.model_version,
        methodology_version=original.methodology_version,
        publication_status="PUBLISHED", # Corrected version replaces published visibility
        requires_human_approval=original.requires_human_approval,
        reviewer=data.reviewer,
        reviewed_at=now,
        review_notes=f"Corrected version based on: {data.reason}",
        version=original.version + 1,
        correction_status="CORRECTED",
        provenance=original.provenance,
        created_at=now,
        updated_at=now
    )

    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="CLAIM_CORRECTED",
        user_or_system=data.reviewer,
        details={"original_id": claim_id, "new_id": new_claim_id, "reason": data.reason},
        timestamp=now
    )

    db.add(correction)
    db.add(new_claim)
    db.add(audit)
    db.commit()

    return {
        "status": "CORRECTED",
        "original_claim_id": original.claim_id,
        "new_claim_id": new_claim.claim_id,
        "version": new_claim.version,
        "reason": data.reason,
        "corrected_at": now.isoformat()
    }

@router.post("/claims/{claim_id}/withdraw")
def withdraw_claim(claim_id: str, reason: str = Query(..., description="Withdrawal rationale"), reviewer: str = Query(..., description="Authorizing official"), db: Session = Depends(get_db)):
    """
    Section 13:
    Withdraws a published claim. Withdrawn claims immediately disappear from public API.
    """
    claim = db.query(ClaimPublication).filter(ClaimPublication.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    now = datetime.now(timezone.utc)
    claim.publication_status = "WITHDRAWN"
    claim.correction_status = "WITHDRAWN"
    claim.updated_at = now

    correction = CorrectionRecord(
        id=f"cor_{uuid.uuid4().hex[:10]}",
        claim_id=claim.claim_id,
        action_type="WITHDRAW",
        original_version=claim.version,
        corrected_version=claim.version,
        reason=reason,
        changed_by=reviewer,
        changed_at=now,
        evidence_ids=claim.evidence_ids,
        reviewer=reviewer
    )

    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="CLAIM_WITHDRAWN",
        user_or_system=reviewer,
        details={"claim_id": claim_id, "reason": reason},
        timestamp=now
    )

    db.add(correction)
    db.add(audit)
    db.commit()

    return {
        "status": "WITHDRAWN",
        "claim_id": claim.claim_id,
        "reason": reason,
        "withdrawn_at": now.isoformat()
    }

@router.get("/takedowns")
def list_takedown_requests(db: Session = Depends(get_db)):
    """
    Section 14:
    Lists pending and decided notice & takedown requests.
    """
    requests = db.query(TakedownRequest).order_by(TakedownRequest.received_at.desc()).all()
    return [
        {
            "request_id": r.request_id,
            "request_type": r.request_type,
            "target_id": r.target_id,
            "target_type": r.target_type,
            "requester_contact": r.requester_contact,
            "request_description": r.request_description,
            "status": r.status,
            "reviewer": r.reviewer,
            "decision": r.decision,
            "reason": r.reason,
            "received_at": r.received_at.isoformat() if r.received_at else None,
            "decision_timestamp": r.decision_timestamp.isoformat() if r.decision_timestamp else None
        }
        for r in requests
    ]

@router.post("/takedowns/{request_id}/decide")
def decide_takedown_request(request_id: str, data: TakedownDecision, db: Session = Depends(get_db)):
    """
    Section 14:
    Records an administrative decision regarding a takedown/correction request.
    """
    req = db.query(TakedownRequest).filter(TakedownRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Takedown request not found.")

    now = datetime.now(timezone.utc)
    req.status = "RESOLVED"
    req.decision = data.decision
    req.reviewer = data.reviewer
    req.reason = data.reason
    req.decision_timestamp = now

    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="TAKEDOWN_DECISION_RECORDED",
        user_or_system=data.reviewer,
        details={"request_id": request_id, "decision": data.decision, "reason": data.reason},
        timestamp=now
    )

    db.add(audit)
    db.commit()

    return {
        "request_id": req.request_id,
        "status": req.status,
        "decision": req.decision,
        "decision_timestamp": req.decision_timestamp.isoformat()
    }

@router.post("/reports/{report_id}/review")
def review_citizen_report(report_id: str, data: CitizenReportReview, db: Session = Depends(get_db)):
    """
    Section 10:
    Citizen reports are observations, not verified facts.
    AI/automated systems may not upgrade an observation to VERIFIED without a human verification process.
    """
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    now = datetime.now(timezone.utc)
    report.verification_status = data.verification_status
    report.review_status = "HUMAN_REVIEWED"
    report.moderation_notes = data.notes

    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="CITIZEN_REPORT_VERIFIED",
        user_or_system=data.reviewer,
        details={"report_id": report_id, "new_verification_status": data.verification_status, "notes": data.notes},
        timestamp=now
    )

    db.add(audit)
    db.commit()

    return {
        "report_id": report.id,
        "verification_status": report.verification_status,
        "review_status": report.review_status,
        "reviewed_by": data.reviewer
    }

@router.get("/audit-logs")
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """
    Section 20:
    Returns immutable audit trail logs for security and compliance monitoring.
    """
    logs = db.query(SecurityAuditLog).order_by(SecurityAuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "event_type": l.event_type,
            "user_or_system": l.user_or_system,
            "details": l.details,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "ip_address": l.ip_address
        }
        for l in logs
    ]

@router.get("/scheduler/status")
def get_scheduler_status():
    """
    Master Prompt Section 15 & 16:
    Returns live automated background scheduler status, source health, and intervals.
    """
    from apps.api.app.core.scheduler import source_scheduler
    return source_scheduler.get_status()

@router.post("/scheduler/trigger/{source_id}")
async def trigger_scheduler_source(source_id: str, db: Session = Depends(get_db)):
    """
    Master Prompt Section 15 & 16:
    Manually triggers an immediate automated ingestion run for a source through the scheduler.
    """
    from apps.api.app.core.scheduler import source_scheduler
    result = await source_scheduler.run_source_now(source_id, db=db)
    return result

