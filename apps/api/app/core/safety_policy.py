import re
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class InformationClassification(str, Enum):
    FACT = "FACT"
    OFFICIAL_RECORD = "OFFICIAL_RECORD"
    MEASURED_FACT = "MEASURED_FACT"
    DERIVED = "DERIVED"
    MODELED = "MODELED"
    FORECAST = "FORECAST"
    CITIZEN_REPORTED = "CITIZEN_REPORTED"
    UNVERIFIED = "UNVERIFIED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"

class PublicationStatus(str, Enum):
    DRAFT = "DRAFT"
    AUTOMATED_VALIDATION = "AUTOMATED_VALIDATION"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    CORRECTED = "CORRECTED"

class ClaimType(str, Enum):
    GENERAL_OBSERVATION = "GENERAL_OBSERVATION"
    HYDROLOGICAL_STATUS = "HYDROLOGICAL_STATUS"
    SPATIAL_EXPOSURE = "SPATIAL_EXPOSURE"
    FACILITY_SPECIFIC_STATEMENT = "FACILITY_SPECIFIC_STATEMENT"
    CONTAMINATION_CLAIM = "CONTAMINATION_CLAIM"
    ADVERSE_STATEMENT = "ADVERSE_STATEMENT"
    SOURCE_ESTIMATION = "SOURCE_ESTIMATION"
    ALERT_STATEMENT = "ALERT_STATEMENT"

# Strictly prohibited defamatory, causal, and accusatory terms without certified judicial/lab records
PROHIBITED_PATTERNS = [
    re.compile(r"is (the|a) source of (toxic|hazardous|illegal) contamination", re.IGNORECASE),
    re.compile(r"polluted (this|the|our) area", re.IGNORECASE),
    re.compile(r"illegally (dumped|discharged|released|operated)", re.IGNORECASE),
    re.compile(r"(most|more) dangerous (factory|facility|plant)", re.IGNORECASE),
    re.compile(r"(worst|dirtiest) (factory|facility|plant)", re.IGNORECASE),
    re.compile(r"highest pollution (factory|facility|plant)", re.IGNORECASE),
    re.compile(r"\bconfirmed polluter\b", re.IGNORECASE),
    re.compile(r"\bpoisoned area\b", re.IGNORECASE),
    re.compile(r"\billegal factory\b", re.IGNORECASE),
    re.compile(r"factory caused (the )?contamination", re.IGNORECASE),
    re.compile(r"โรงงานทำ(น้ำเสีย|สารเคมีรั่ว|พิษปนเปื้อน)", re.IGNORECASE),
    re.compile(r"โรงงานเถื่อน|โรงงานผิดกฎหมาย", re.IGNORECASE),
    re.compile(r"โรงงานตัวการ|ปล่อยสารพิษเจตนา", re.IGNORECASE),
]

SAFE_TERMINOLOGY_RECOMMENDATIONS = [
    "Potential exposure area",
    "Estimated source area",
    "Modeled hydrological connectivity",
    "Area requiring further investigation",
    "Monitoring priority",
    "Unconfirmed",
    "Insufficient verified evidence",
]

PUBLIC_METHODOLOGY_DISCLAIMER = (
    "FloodTrace presents verified source records, measurements, derived geospatial analysis, "
    "model outputs, forecasts, and citizen observations as separately labeled information.\n\n"
    "Modeled risk or hydrological connectivity does not by itself establish contamination or causation.\n\n"
    "Facility presence in this system does not imply wrongdoing or contamination.\n\n"
    "Environmental contamination should be confirmed using appropriate official measurements "
    "or qualified laboratory evidence."
)

def validate_claim_text(text: str) -> Tuple[bool, List[str]]:
    """
    Validates text against prohibited accusatory and defamatory phrasing.
    Returns (is_valid, list_of_violations).
    """
    violations = []
    if not text or not text.strip():
        violations.append("Claim text cannot be empty.")
        return False, violations

    for pattern in PROHIBITED_PATTERNS:
        if pattern.search(text):
            violations.append(
                f"Prohibited causal/accusatory phrase detected matching pattern: '{pattern.pattern}'. "
                f"Use objective terminology (e.g. 'Potential exposure area', 'Area requiring further investigation')."
            )
            
    return (len(violations) == 0), violations

def check_requires_human_approval(
    claim_type: ClaimType, 
    claim_text: str, 
    mentions_specific_facility_or_person: bool = False
) -> bool:
    """
    Section 2 Mandate:
    Require human approval for:
    - adverse statements
    - contamination claims
    - facility-specific risk statements
    - source-estimation results
    - citizen reports that mention a specific facility/person
    - alerts containing facility-specific attribution
    """
    sensitive_claim_types = {
        ClaimType.ADVERSE_STATEMENT,
        ClaimType.CONTAMINATION_CLAIM,
        ClaimType.FACILITY_SPECIFIC_STATEMENT,
        ClaimType.SOURCE_ESTIMATION,
        ClaimType.ALERT_STATEMENT,
    }
    
    if claim_type in sensitive_claim_types:
        return True

    if mentions_specific_facility_or_person:
        return True

    # Check for keywords indicating facility-specific assertions or contamination
    sensitive_keywords = ["โรงงาน", "facility", "plant", "diw", "ปนเปื้อน", "contamination", "toxic", "leak"]
    lower_text = claim_text.lower()
    if any(k in lower_text for k in sensitive_keywords):
        return True

    return False

def validate_evidence_bundle(bundle: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Section 3 Mandate:
    Every publishable claim must contain an evidence bundle.
    Required fields:
    claim_id, claim_text, claim_type, source_ids[], evidence_ids[],
    source_timestamp, retrieved_at, data_version, model_version,
    methodology_version, review_status, publication_status.
    A claim cannot be published if required evidence is missing.
    """
    errors = []
    required_keys = [
        "claim_id", "claim_text", "claim_type", "source_ids", "evidence_ids",
        "source_timestamp", "retrieved_at", "data_version", "model_version",
        "methodology_version", "review_status", "publication_status"
    ]
    
    for key in required_keys:
        if key not in bundle or bundle[key] is None:
            errors.append(f"Missing required evidence bundle field: '{key}'.")

    # source_ids and evidence_ids must not be empty for publishable claims
    if "source_ids" in bundle and not bundle["source_ids"]:
        errors.append("source_ids cannot be empty. Evidence bundle must link to at least one verified source ID.")
    elif "source_ids" in bundle:
        from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
        from apps.api.app.core.config import settings
        if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION:
            for sid in bundle["source_ids"]:
                access_eval = evaluate_source_access(sid, enforce_private_production=True)
                if access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
                    errors.append(
                        f"Source '{sid}' has authorization status '{access_eval.authorization_status.value}' "
                        f"and is blocked from production publication. Private authorized access required."
                    )
        
    if "evidence_ids" in bundle and not bundle["evidence_ids"]:
        errors.append("evidence_ids cannot be empty. Evidence bundle must link to at least one physical or official evidence ID.")

    return (len(errors) == 0), errors
