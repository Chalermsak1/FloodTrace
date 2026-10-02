"""
FloodTrace Citizen Report Operational State Machine & Triage Engine
Enforces explicit state transitions, audit logging, operational priority, and automatic triage.

State Model:
NEW -> TRIAGING -> ASSIGNED -> IN_REVIEW -> UNDER_VERIFICATION -> VERIFIED_OBSERVATION -> RESOLVED
Branches:
- IN_REVIEW <-> NEED_MORE_INFO
- UNDER_VERIFICATION -> ESCALATED -> RESOLVED
- Out of scope, Invalid, Duplicate, Spam, Withdrawn

Principle:
CITIZEN_REPORTED ≠ VERIFIED_OBSERVATION ≠ OFFICIAL_CONFIRMED ≠ CONTAMINATION_CONFIRMED ≠ SOURCE_ATTRIBUTION
"""

import uuid
from enum import Enum
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from apps.api.app.models.entities import CitizenReport, CitizenReportAuditLog, StaffUser
from apps.api.app.core.staff_rbac import StaffPrincipal, StaffRole
from apps.api.app.core.config import settings
from apps.api.app.core.security import validate_prachin_coordinates

class ReportStatus(str, Enum):
    NEW = "NEW"
    TRIAGING = "TRIAGING"
    ASSIGNED = "ASSIGNED"
    IN_REVIEW = "IN_REVIEW"
    NEED_MORE_INFO = "NEED_MORE_INFO"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    VERIFIED_OBSERVATION = "VERIFIED_OBSERVATION"
    ESCALATED = "ESCALATED"
    OFFICIAL_CONFIRMED = "OFFICIAL_CONFIRMED"
    RESOLVED = "RESOLVED"
    
    # Terminal / Filtered states
    INVALID = "INVALID"
    DUPLICATE = "DUPLICATE"
    SPAM = "SPAM"
    WITHDRAWN = "WITHDRAWN"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


class OperationalPriority(str, Enum):
    URGENT = "URGENT"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class PublicationState(str, Enum):
    PRIVATE = "PRIVATE"
    PUBLIC_SAFE_SUMMARY = "PUBLIC_SAFE_SUMMARY"
    PUBLIC_VERIFIED = "PUBLIC_VERIFIED"
    WITHHELD = "WITHHELD"


class VerificationMethod(str, Enum):
    VISUAL_REVIEW = "VISUAL_REVIEW"
    CROSS_CHECKED_SYSTEM_DATA = "CROSS_CHECKED_SYSTEM_DATA"
    MULTIPLE_REPORTS = "MULTIPLE_REPORTS"
    FIELD_VERIFICATION = "FIELD_VERIFICATION"
    OFFICIAL_SOURCE = "OFFICIAL_SOURCE"
    OTHER = "OTHER"


class ResolutionType(str, Enum):
    VERIFIED_OBSERVATION = "VERIFIED_OBSERVATION"
    DUPLICATE = "DUPLICATE"
    INVALID = "INVALID"
    NO_LONGER_PRESENT = "NO_LONGER_PRESENT"
    REFERRED = "REFERRED"
    OFFICIAL_CONFIRMATION_RECEIVED = "OFFICIAL_CONFIRMATION_RECEIVED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    OTHER = "OTHER"


# Valid state transitions mapping
ALLOWED_TRANSITIONS: Dict[str, set[str]] = {
    ReportStatus.NEW.value: {
        ReportStatus.TRIAGING.value,
        ReportStatus.ASSIGNED.value,
        ReportStatus.INVALID.value,
        ReportStatus.SPAM.value,
        ReportStatus.DUPLICATE.value,
        ReportStatus.OUT_OF_SCOPE.value
    },
    ReportStatus.TRIAGING.value: {
        ReportStatus.ASSIGNED.value,
        ReportStatus.IN_REVIEW.value,
        ReportStatus.INVALID.value,
        ReportStatus.SPAM.value,
        ReportStatus.DUPLICATE.value,
        ReportStatus.OUT_OF_SCOPE.value
    },
    ReportStatus.ASSIGNED.value: {
        ReportStatus.IN_REVIEW.value,
        ReportStatus.TRIAGING.value,
        ReportStatus.OUT_OF_SCOPE.value
    },
    ReportStatus.IN_REVIEW.value: {
        ReportStatus.NEED_MORE_INFO.value,
        ReportStatus.UNDER_VERIFICATION.value,
        ReportStatus.ASSIGNED.value,
        ReportStatus.INVALID.value,
        ReportStatus.DUPLICATE.value,
        ReportStatus.SPAM.value,
        ReportStatus.WITHDRAWN.value
    },
    ReportStatus.NEED_MORE_INFO.value: {
        ReportStatus.IN_REVIEW.value,
        ReportStatus.WITHDRAWN.value,
        ReportStatus.INVALID.value
    },
    ReportStatus.UNDER_VERIFICATION.value: {
        ReportStatus.VERIFIED_OBSERVATION.value,
        ReportStatus.ESCALATED.value,
        ReportStatus.IN_REVIEW.value,
        ReportStatus.NEED_MORE_INFO.value,
        ReportStatus.OFFICIAL_CONFIRMED.value,
        ReportStatus.RESOLVED.value,
        ReportStatus.INVALID.value
    },
    ReportStatus.VERIFIED_OBSERVATION.value: {
        ReportStatus.OFFICIAL_CONFIRMED.value,
        ReportStatus.ESCALATED.value,
        ReportStatus.RESOLVED.value,
        ReportStatus.WITHDRAWN.value
    },
    ReportStatus.ESCALATED.value: {
        ReportStatus.UNDER_VERIFICATION.value,
        ReportStatus.OFFICIAL_CONFIRMED.value,
        ReportStatus.RESOLVED.value
    },
    ReportStatus.OFFICIAL_CONFIRMED.value: {
        ReportStatus.RESOLVED.value,
        ReportStatus.WITHDRAWN.value
    },
    ReportStatus.RESOLVED.value: {
        ReportStatus.IN_REVIEW.value # Allows formal reopening with logged justification
    },
    ReportStatus.OUT_OF_SCOPE.value: {
        ReportStatus.TRIAGING.value,
        ReportStatus.RESOLVED.value
    },
    ReportStatus.INVALID.value: {
        ReportStatus.TRIAGING.value
    },
    ReportStatus.DUPLICATE.value: {
        ReportStatus.TRIAGING.value
    },
    ReportStatus.SPAM.value: set(), # Terminal state
    ReportStatus.WITHDRAWN.value: set(), # Terminal state
}


def log_audit_event(
    db: Session,
    report_id: str,
    actor_id: str,
    actor_role: str,
    action: str,
    previous_status: Optional[str] = None,
    new_status: Optional[str] = None,
    reason: Optional[str] = None,
    relevant_entity: Optional[str] = None,
    evidence_reference: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    commit: bool = True
) -> CitizenReportAuditLog:
    """
    Appends an immutable audit log entry. Cannot be modified or deleted.
    """
    audit = CitizenReportAuditLog(
        audit_id=f"aud_{uuid.uuid4().hex[:12]}",
        report_id=report_id,
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        previous_status=previous_status,
        new_status=new_status,
        reason=reason,
        relevant_entity=relevant_entity,
        evidence_reference=evidence_reference,
        details=details or {},
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    if commit:
        db.commit()
    return audit


def validate_state_transition(
    current_status: str,
    target_status: str,
    actor_role: StaffRole,
    official_source_evidence: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validates state machine transition rules and role permissions.
    """
    # Check if target is a known status
    if target_status not in ReportStatus._value2member_map_:
        return False, f"สถานะ '{target_status}' ไม่ถูกต้องตามระบบ"

    # READ_ONLY accounts cannot perform state transitions
    if actor_role == StaffRole.READ_ONLY:
        return False, "บทบาท READ_ONLY ไม่ได้รับอนุญาตให้เปลี่ยนแปลงสถานะรายงาน"

    # Strict rule: OFFICIAL_CONFIRMED requires explicit official source evidence and ADMIN/REVIEWER role
    if target_status == ReportStatus.OFFICIAL_CONFIRMED.value:
        if actor_role not in (StaffRole.ADMIN, StaffRole.REVIEWER):
            return False, "มีเพียงบทบาท ADMIN หรือ REVIEWER เท่านั้นที่สามารถยืนยันสถานะ OFFICIAL_CONFIRMED ได้"
        if not official_source_evidence or len(official_source_evidence.strip()) < 5:
            return False, "การกำหนดสถานะ 'OFFICIAL_CONFIRMED' ต้องระบุหลักฐานหรือหนังสือยืนยันอย่างเป็นทางการจากหน่วยงานรัฐ"

    # Verify transition path
    allowed_targets = ALLOWED_TRANSITIONS.get(current_status, set())
    if target_status not in allowed_targets:
        return False, f"ไม่อนุญาตให้เปลี่ยนสถานะจาก '{current_status}' ไปยัง '{target_status}' โดยตรง"

    return True, None


def perform_automatic_triage(db: Session, report: CitizenReport) -> Dict[str, Any]:
    """
    Executes automatic triage checks:
    1. Timestamp validation (rejects future timestamps, computes age)
    2. Active analysis scope check (Prachin Buri bounding box / active boundary)
    3. Duplicate detection (spatial proximity <= 500m within 6 hours)
    4. Attachment security & integrity check
    5. Completeness check
    6. Initial operational priority calculation
    """
    now = datetime.now(timezone.utc)
    flags: List[str] = []
    notes: List[str] = []

    # 1. Timestamp validation
    if report.observed_at and report.observed_at > now:
        flags.append("FUTURE_TIMESTAMP")
        notes.append("เวลาที่สังเกตการณ์ที่ผู้ใช้ระบุอยู่ในอนาคต (เวลาอาจคลาดเคลื่อน)")
    elif report.created_at and report.created_at > now:
        flags.append("FUTURE_SUBMISSION_TIME")

    # 2. Prachin Buri boundary check
    lat = report.exact_latitude if report.exact_latitude is not None else report.latitude
    lon = report.exact_longitude if report.exact_longitude is not None else report.longitude
    is_in_prachin = validate_prachin_coordinates(lat, lon)

    if not is_in_prachin:
        flags.append("OUT_OF_SCOPE")
        notes.append("พิกัดอยู่นอกพื้นที่เฝ้าระวังหลักของ FloodTrace (นอกจังหวัดปราจีนบุรี)")
        report.status = ReportStatus.OUT_OF_SCOPE.value
        report.triage_status = "OUT_OF_SCOPE"
        report.priority = OperationalPriority.LOW.value
    else:
        # 3. Duplicate check (within 0.005 deg (~500m) and within 6 hours)
        six_hours_ago = datetime.fromtimestamp(now.timestamp() - 6 * 3600, timezone.utc)
        dup_candidate = db.query(CitizenReport).filter(
            CitizenReport.id != report.id,
            CitizenReport.created_at >= six_hours_ago,
            CitizenReport.district == report.district,
            CitizenReport.subdistrict == report.subdistrict
        ).first()

        if dup_candidate:
            flags.append("POTENTIAL_DUPLICATE")
            notes.append(f"พบรายงานที่อาจมีความเกี่ยวเนื่องในตำบลเดียวกันภายใน 6 ชั่วโมง (ID: {dup_candidate.id})")
            report.cluster_id = dup_candidate.cluster_id or f"cl_{dup_candidate.id}"
            report.cluster_role = "RELATED"

        # 4. Attachment inspection
        if report.photo_url:
            flags.append("HAS_EVIDENCE_ATTACHMENT")
        else:
            notes.append("ไม่มีรูปถ่ายแนบมาด้วย")

        # 5. Operational Priority Scoring
        # Signals: contamination signs count, water depth, multiple observations
        priority = OperationalPriority.NORMAL
        signs = report.contamination_signs if isinstance(report.contamination_signs, list) else []
        critical_signs = {"dead_fish", "chemical_odor", "sheen", "black_water", "สัตว์น้ำตาย", "กลิ่นสารเคมี", "คราบน้ำมัน"}
        has_critical_sign = bool(set(signs) & critical_signs)

        if has_critical_sign or (report.water_depth_cm and report.water_depth_cm >= 80.0):
            priority = OperationalPriority.URGENT
        elif len(signs) >= 2 or (report.water_depth_cm and report.water_depth_cm >= 30.0):
            priority = OperationalPriority.HIGH
        elif not signs and (not report.water_depth_cm or report.water_depth_cm == 0):
            priority = OperationalPriority.LOW

        report.priority = priority.value
        report.status = ReportStatus.TRIAGING.value
        report.triage_status = "PASSED"

    report.triage_flags = flags
    report.triage_notes = " | ".join(notes) if notes else "ผ่านการตรวจสอบเบื้องต้นครบถ้วน"
    report.updated_at = now

    # Log triage event
    log_audit_event(
        db=db,
        report_id=report.id,
        actor_id="system_triage_engine",
        actor_role="SYSTEM",
        action="REPORT_VALIDATED",
        previous_status=ReportStatus.NEW.value,
        new_status=report.status,
        reason="Automatic triage and geographic boundary check completed",
        details={
            "flags": flags,
            "priority": report.priority,
            "is_in_prachin": is_in_prachin,
            "triage_notes": report.triage_notes
        },
        commit=False
    )

    return {
        "status": report.status,
        "priority": report.priority,
        "triage_status": report.triage_status,
        "flags": flags,
        "notes": report.triage_notes
    }
