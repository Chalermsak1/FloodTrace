"""Shared allowlist for citizen reports that may affect public output."""

from typing import Optional

from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.orm import aliased

from apps.api.app.models.entities import CitizenReport, CitizenReportVerification


PUBLIC_PUBLICATION_STATES = frozenset({"PUBLIC_SAFE_SUMMARY", "PUBLIC_VERIFIED"})
_VERIFIED_OBSERVATION_METHODS = frozenset(
    {"VISUAL_REVIEW", "FIELD_VERIFICATION", "MULTIPLE_REPORTS", "CROSS_CHECKED_SYSTEM_DATA"}
)
LEGACY_CLIENT_SUBSTITUTION_FINGERPRINT = {
    "what_was_reported": "ตามคำให้การผู้แจ้ง",
    "what_was_observed": "ตรวจสอบภาพถ่ายและพื้นที่",
    "what_system_data_shows": "ข้อมูลระดับน้ำและฝนในเกณฑ์ปกติ",
    "what_model_suggests": "แบบจำลองแสดงความเสี่ยงปานกลาง",
    "what_is_unknown": "รอผลตรวจทางเคมี",
    "what_should_be_verified": "เก็บตัวอย่างน้ำส่งตรวจเพิ่มเติม",
}


def verification_is_valid(
    status: Optional[str],
    assessment: Optional[dict],
    method: Optional[str],
    official_evidence: Optional[str],
) -> bool:
    """Return whether verification satisfies the P0-1 status-specific evidence rule."""
    assessment = assessment if isinstance(assessment, dict) else {}
    if any(assessment.get(key) == value for key, value in LEGACY_CLIENT_SUBSTITUTION_FINGERPRINT.items()):
        return False
    observed = assessment.get("what_was_observed")
    clean_method = (method or "").strip().upper()
    has_observed_evidence = isinstance(observed, str) and bool(observed.strip())
    if status == "VERIFIED_OBSERVATION":
        return has_observed_evidence and clean_method in _VERIFIED_OBSERVATION_METHODS
    if status == "OFFICIAL_CONFIRMED":
        return (
            has_observed_evidence
            and clean_method == "OFFICIAL_SOURCE"
            and isinstance(official_evidence, str)
            and len(official_evidence.strip()) >= 5
        )
    return status in {"UNVERIFIED", "PARTIALLY_VERIFIED"}


def public_report_predicate():
    """SQL predicate shared by every public citizen-report consumer.

    PUBLIC_VERIFIED is eligible only when the latest verification row matches
    the report's current verification status and meets its explicit evidence
    criteria. Unknown states and missing verification rows fail closed.
    """
    verification = aliased(CitizenReportVerification)
    latest_verification_id = (
        select(CitizenReportVerification.id)
        .where(CitizenReportVerification.report_id == CitizenReport.id)
        .order_by(CitizenReportVerification.verified_at.desc(), CitizenReportVerification.id.desc())
        .limit(1)
        .correlate(CitizenReport)
        .scalar_subquery()
    )
    observed = verification.structured_assessment["what_was_observed"].as_string()
    substituted = or_(*(
        func.coalesce(verification.structured_assessment[key].as_string() == value, False)
        for key, value in LEGACY_CLIENT_SUBSTITUTION_FINGERPRINT.items()
    ))
    has_observed = and_(
        observed.is_not(None),
        func.length(func.trim(observed)) > 0,
        ~substituted,
    )
    valid_verified_observation = and_(
        verification.verification_status == "VERIFIED_OBSERVATION",
        func.upper(func.trim(verification.verification_method)).in_(tuple(_VERIFIED_OBSERVATION_METHODS)),
        has_observed,
    )
    official_evidence = verification.official_source_evidence
    valid_official_confirmation = and_(
        verification.verification_status == "OFFICIAL_CONFIRMED",
        func.upper(func.trim(verification.verification_method)) == "OFFICIAL_SOURCE",
        has_observed,
        official_evidence.is_not(None),
        func.length(func.trim(official_evidence)) >= 5,
    )
    valid_latest_verification = exists(
        select(1).where(
            verification.id == latest_verification_id,
            verification.report_id == CitizenReport.id,
            verification.verification_status == CitizenReport.verification_status,
            or_(valid_verified_observation, valid_official_confirmation),
        )
    )
    return or_(
        CitizenReport.publication_state == "PUBLIC_SAFE_SUMMARY",
        and_(CitizenReport.publication_state == "PUBLIC_VERIFIED", valid_latest_verification),
    )
