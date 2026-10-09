from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, JSON, Text
from datetime import datetime, timezone
from apps.api.app.core.database import Base

class WaterStation(Base):
    __tablename__ = "water_stations"

    id = Column(String, primary_key=True, index=True) # Station code
    name_th = Column(String, nullable=False)
    name_en = Column(String, nullable=True)
    basin = Column(String, nullable=False)
    district = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    water_level_msl = Column(Float, nullable=True) # MEASURED_FACT (meters MSL)
    ground_level_msl = Column(Float, nullable=True)
    warning_level_msl = Column(Float, nullable=True)
    critical_level_msl = Column(Float, nullable=True)
    status = Column(String, default="STAGE_RECORDED") # STAGE_RECORDED, SENSOR_OUTLIER_STALE, NO_DATA
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    provenance = Column(JSON, nullable=False)

class RainfallStation(Base):
    __tablename__ = "rainfall_stations"

    id = Column(String, primary_key=True, index=True) # Station code
    name_th = Column(String, nullable=False)
    name_en = Column(String, nullable=True)
    basin = Column(String, nullable=True)
    district = Column(String, nullable=True)
    subdistrict = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    rain_24h_mm = Column(Float, nullable=True) # MEASURED_FACT (mm in 24 hours)
    rain_1h_mm = Column(Float, nullable=True)  # MEASURED_FACT (mm in 1 hour)
    observation_time = Column(String, nullable=True)
    agency = Column(String, nullable=True)
    status = Column(String, default="RAINFALL_RECORDED") # RAINFALL_RECORDED, NO_DATA
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    provenance = Column(JSON, nullable=False)

class Reservoir(Base):
    __tablename__ = "reservoirs"

    id = Column(String, primary_key=True, index=True)
    name_th = Column(String, nullable=False)
    capacity_mcm = Column(Float, nullable=False) # OFFICIAL_RECORD (design capacity)
    storage_mcm = Column(Float, nullable=True)   # MEASURED_FACT if available, else null
    storage_percent = Column(Float, nullable=True)
    inflow_mcm_day = Column(Float, nullable=True)
    outflow_mcm_day = Column(Float, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    district = Column(String, nullable=True)
    status = Column(String, default="NO_DATA") # TELEMETRY_RECORDED, NO_DATA
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    provenance = Column(JSON, nullable=False)

class IndustrialFacility(Base):
    __tablename__ = "industrial_facilities"

    id = Column(String, primary_key=True, index=True) # DIW Reg ID e.g. 3-101-1/37ปจ
    fid = Column(String, nullable=True)
    name = Column(String, nullable=False)
    business_type = Column(Text, nullable=False)
    facility_type = Column(String, nullable=False) # 101, 105, 106
    official_activity_category = Column(String, nullable=True)
    address = Column(String, nullable=True)
    subdistrict = Column(String, nullable=False)
    district = Column(String, nullable=False)
    province = Column(String, default="ปราจีนบุรี")
    latitude = Column(Float, nullable=False) # DERIVED (subdistrict centroid)
    longitude = Column(Float, nullable=False)
    horsepower = Column(Float, default=0.0)
    workers = Column(Integer, default=0)
    capital = Column(Float, default=0.0)
    official_licensed_capacity = Column(String, nullable=True)
    hazard_evidence_status = Column(String, default="INSUFFICIENT_DATA") # Strict fail-closed
    hazard_classification = Column(String, default="NOT_AVAILABLE_IN_REGISTRY")
    chemical_assay_evidence = Column(String, default="INSUFFICIENT_DATA — No chemical lab assays published in DIW registry")
    environmental_inspection_evidence = Column(String, default="INSUFFICIENT_DATA — No PCD inspection violations reported in registry")
    provenance = Column(JSON, nullable=False) # OFFICIAL_RECORD

class ExposureScreeningItem(Base):
    __tablename__ = "exposure_screening"

    id = Column(String, primary_key=True, index=True)
    target_id = Column(String, index=True)
    name = Column(String, nullable=False)
    facility_type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    district = Column(String, nullable=False)
    subdistrict = Column(String, nullable=False)
    proximity_to_river_km = Column(Float, nullable=False) # DERIVED (GIS distance)
    nearest_river_name = Column(String, nullable=False)
    nearest_station_id = Column(String, nullable=True)
    nearest_station_stage_msl = Column(Float, nullable=True) # MEASURED_FACT
    screening_priority = Column(String, nullable=False) # HIGH_PROXIMITY_INSPECTION_NEEDED, MODERATE_PROXIMITY, LOW_PROXIMITY
    priority_rank = Column(Integer, nullable=False)
    hazard_data_status = Column(String, default="INSUFFICIENT DATA — NO VERIFIED WASTE HAZARD RECORD")
    contamination_status = Column(String, default="UNCONFIRMED — NO CONTAMINATION MEASUREMENT")
    methodology_audit = Column(JSON, nullable=False)
    last_calculated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    provenance = Column(JSON, nullable=False) # DERIVED

class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(String, primary_key=True, index=True)
    # PRIVATE DATA (Never exposed via public endpoints)
    reporter_name = Column(String, nullable=False) # e.g. Anonymized or Real Name
    reporter_role = Column(String, default="CITIZEN")
    reporter_email = Column(String, nullable=True) # PRIVATE
    reporter_phone = Column(String, nullable=True) # PRIVATE
    exact_latitude = Column(Float, nullable=False) # PRIVATE
    exact_longitude = Column(Float, nullable=False) # PRIVATE
    moderation_notes = Column(Text, nullable=True) # PRIVATE

    # PUBLIC DATA (Safely generalized / scrubbed)
    latitude = Column(Float, nullable=False) # Backwards compatible field (= public_latitude)
    longitude = Column(Float, nullable=False) # Backwards compatible field (= public_longitude)
    public_latitude = Column(Float, nullable=False) # Generalized coordinate (~1.1 km resolution)
    public_longitude = Column(Float, nullable=False) # Generalized coordinate (~1.1 km resolution)
    district = Column(String, nullable=False)
    subdistrict = Column(String, nullable=False)
    water_depth_cm = Column(Float, default=0.0)
    water_flow_speed = Column(String, default="SLOW")
    contamination_signs = Column(JSON, default=list) # User-claimed observations (unverified)
    description = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    verification_status = Column(String, default="UNVERIFIED") # UNVERIFIED, UNDER_REVIEW, VERIFIED, REJECTED
    review_status = Column(String, default="PENDING_REVIEW")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    provenance = Column(JSON, nullable=False) # CITIZEN_REPORTED

    # OPERATIONAL WORKFLOW & BACK-OFFICE STATE (Master Spec Section 7 & 9)
    status = Column(String, default="NEW", index=True) # NEW, TRIAGING, ASSIGNED, IN_REVIEW, NEED_MORE_INFO, UNDER_VERIFICATION, VERIFIED_OBSERVATION, ESCALATED, OFFICIAL_CONFIRMED, RESOLVED, INVALID, DUPLICATE, SPAM, WITHDRAWN, OUT_OF_SCOPE
    priority = Column(String, default="NORMAL", index=True) # URGENT, HIGH, NORMAL, LOW
    category = Column(String, default="GENERAL", index=True) # e.g. "น้ำเปลี่ยนสี", "คราบบนผิวน้ำ", "กลิ่นผิดปกติ", etc.
    observed_at = Column(DateTime(timezone=True), nullable=True) # Citizen stated observation time
    
    # ASSIGNMENT
    assigned_to = Column(String, nullable=True, index=True) # Staff username
    assigned_by = Column(String, nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    assignment_note = Column(Text, nullable=True)
    
    # CLUSTERING & RELATIONSHIP
    cluster_id = Column(String, nullable=True, index=True)
    cluster_role = Column(String, default="INDEPENDENT") # DUPLICATE, RELATED, INDEPENDENT
    
    # PUBLICATION STATE (Master Spec Section 24)
    publication_state = Column(String, default="PRIVATE", index=True) # PRIVATE, PUBLIC_SAFE_SUMMARY, PUBLIC_VERIFIED, WITHHELD
    
    # TRIAGE & VALIDATION (Master Spec Section 8)
    triage_status = Column(String, default="PENDING", index=True) # PASSED, FLAGGED, OUT_OF_SCOPE
    triage_flags = Column(JSON, default=list) # e.g. ["OUT_OF_BOUNDS", "POTENTIAL_DUPLICATE"]
    triage_notes = Column(Text, nullable=True)
    
    # RESOLUTION (Master Spec Section 21)
    resolution_type = Column(String, nullable=True) # VERIFIED_OBSERVATION, DUPLICATE, INVALID, NO_LONGER_PRESENT, REFERRED, OFFICIAL_CONFIRMATION_RECEIVED, INSUFFICIENT_EVIDENCE, OTHER
    resolution_summary = Column(Text, nullable=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class ClaimPublication(Base):
    """
    Formal publication workflow model for sensitive environmental statements and claims.
    Workflow: DRAFT -> AUTOMATED_VALIDATION -> HUMAN_REVIEW -> APPROVED -> PUBLISHED
    Terminal/Alternative: REJECTED, WITHDRAWN, CORRECTED
    """
    __tablename__ = "claim_publications"

    claim_id = Column(String, primary_key=True, index=True)
    claim_text = Column(Text, nullable=False)
    claim_type = Column(String, nullable=False) # e.g. SPATIAL_EXPOSURE, CONTAMINATION_CLAIM, ADVERSE_STATEMENT
    category = Column(String, nullable=False) # FACT, OFFICIAL_RECORD, MEASURED_FACT, DERIVED, MODELED, FORECAST, etc.
    
    # Evidence Bundle
    source_ids = Column(JSON, default=list) # List of official source URLs or catalog IDs
    evidence_ids = Column(JSON, default=list) # List of physical/official evidence IDs
    source_timestamp = Column(DateTime(timezone=True), nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    data_version = Column(String, default="v1.0")
    model_version = Column(String, default="v2.0-Audit")
    methodology_version = Column(String, default="MCE-2026-v1")
    
    # Publication & Review State
    publication_status = Column(String, default="DRAFT", index=True)
    requires_human_approval = Column(Boolean, default=True)
    reviewer = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    correction_status = Column(String, default="ORIGINAL") # ORIGINAL, CORRECTED, SUPERSEDED
    version = Column(Integer, default=1)
    superseded_by = Column(String, nullable=True) # References new claim_id if corrected
    
    provenance = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class CorrectionRecord(Base):
    """
    Audit log of all public claim modifications, updates, and withdrawals.
    """
    __tablename__ = "correction_records"

    id = Column(String, primary_key=True, index=True)
    claim_id = Column(String, index=True, nullable=False)
    action_type = Column(String, nullable=False) # CORRECT, UPDATE, WITHDRAW, ARCHIVE
    original_version = Column(Integer, nullable=False)
    corrected_version = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    changed_by = Column(String, nullable=False)
    changed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    evidence_ids = Column(JSON, default=list)
    reviewer = Column(String, nullable=False)

class TakedownRequest(Base):
    """
    Notice & Takedown / Correction Request processing workflow.
    """
    __tablename__ = "takedown_requests"

    request_id = Column(String, primary_key=True, index=True)
    request_type = Column(String, nullable=False) # FACTUAL_CORRECTION, DATA_SOURCE_CHALLENGE, PRIVACY_REQUEST, REMOVAL_REQUEST, SECURITY_REPORT, ABUSIVE_CONTENT
    target_id = Column(String, nullable=False) # Target claim_id, report_id, or facility_id
    target_type = Column(String, nullable=False) # CLAIM, REPORT, FACILITY, STATION
    requester_contact = Column(String, nullable=False) # Email or encrypted contact
    request_description = Column(Text, nullable=False)
    status = Column(String, default="RECEIVED", index=True) # RECEIVED, UNDER_REVIEW, RESOLVED, REJECTED
    reviewer = Column(String, nullable=True)
    decision = Column(String, nullable=True) # APPROVED_REMOVAL, APPROVED_CORRECTION, REJECTED_OFFICIAL_RECORD, NO_ACTION
    reason = Column(Text, nullable=True)
    received_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    decision_timestamp = Column(DateTime(timezone=True), nullable=True)

class SecurityAuditLog(Base):
    """
    Immutable security and administrative action audit log.
    """
    __tablename__ = "security_audit_logs"

    id = Column(String, primary_key=True, index=True)
    event_type = Column(String, index=True, nullable=False) # LOGIN, ADMIN_ACTION, PUBLICATION_APPROVAL, CORRECTION, WITHDRAWAL, RATE_LIMIT_VIOLATION, SECURITY_INCIDENT
    user_or_system = Column(String, nullable=False)
    details = Column(JSON, default=dict) # Sanitized details (no raw passwords or PII)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ip_address = Column(String, nullable=True)

class WaterLevelObservation(Base):
    """
    Historical time-series telemetry observation for water level stations (Master Spec Section 18 & 22).
    Never overwrites historical records. Tracks 24H, 7D, 30D trends.
    Explicit Timing Model (Section 3): observed_at, ingested_at, processed_at, published_at
    """
    __tablename__ = "water_level_observations"

    id = Column(String, primary_key=True, index=True) # UUID or composite
    station_id = Column(String, index=True, nullable=False)
    water_level_msl = Column(Float, nullable=True) # MEASURED_FACT (meters MSL)
    source_timestamp = Column(DateTime(timezone=True), index=True, nullable=True) # Canonical observed_at
    observed_at = Column(DateTime(timezone=True), index=True, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)) # Canonical ingested_at
    ingested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    source_name = Column(String, default="ThaiWater", nullable=False)
    organization = Column(String, default="HII / RID", nullable=False)
    dataset = Column(String, default="waterlevel_load", nullable=False)
    record_id = Column(String, nullable=False)
    access_status = Column(String, default="OPEN_PUBLIC", nullable=False)
    license_status = Column(String, default="OGL-TH", nullable=False)
    data_classification = Column(String, default="HIGH_FREQUENCY", nullable=False)
    freshness_status = Column(String, default="FRESH", nullable=False)
    ingestion_mode = Column(String, default="EXTERNAL_API", nullable=False) # EXTERNAL_API, LOCAL_IMPORT
    provenance = Column(JSON, nullable=False)

class RainfallObservation(Base):
    """
    Historical time-series telemetry observation for rainfall stations (Master Spec Section 18 & 22).
    Never overwrites historical records. Tracks 24H, 7D, 30D trends.
    Explicit Timing Model (Section 3): observed_at, ingested_at, processed_at, published_at
    """
    __tablename__ = "rainfall_observations"

    id = Column(String, primary_key=True, index=True) # UUID or composite
    station_id = Column(String, index=True, nullable=False)
    rain_24h_mm = Column(Float, nullable=True) # MEASURED_FACT (mm)
    rain_1h_mm = Column(Float, nullable=True)
    source_timestamp = Column(DateTime(timezone=True), index=True, nullable=True) # Canonical observed_at
    observed_at = Column(DateTime(timezone=True), index=True, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)) # Canonical ingested_at
    ingested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    source_name = Column(String, default="ThaiWater", nullable=False)
    organization = Column(String, default="HII / TMD", nullable=False)
    dataset = Column(String, default="rain_24h", nullable=False)
    record_id = Column(String, nullable=False)
    access_status = Column(String, default="OPEN_PUBLIC", nullable=False)
    license_status = Column(String, default="OGL-TH", nullable=False)
    data_classification = Column(String, default="HIGH_FREQUENCY", nullable=False)
    freshness_status = Column(String, default="FRESH", nullable=False)
    ingestion_mode = Column(String, default="EXTERNAL_API", nullable=False) # EXTERNAL_API, LOCAL_IMPORT
    provenance = Column(JSON, nullable=False)


class CitizenReportAuditLog(Base):
    """
    Append-only immutable audit log of all citizen report operational events.
    Normal staff cannot modify or delete audit entries.
    """
    __tablename__ = "citizen_report_audit_logs"

    audit_id = Column(String, primary_key=True, index=True)
    report_id = Column(String, index=True, nullable=False)
    actor_id = Column(String, nullable=False)
    actor_role = Column(String, nullable=False) # ADMIN, REVIEWER, OPERATOR, READ_ONLY, SYSTEM
    action = Column(String, index=True, nullable=False)
    # Actions: REPORT_RECEIVED, REPORT_VALIDATED, REPORT_ASSIGNED, REPORT_REASSIGNED, STATUS_CHANGED,
    # PRIORITY_CHANGED, EVIDENCE_VIEWED, EVIDENCE_ADDED, INFO_REQUESTED, INFO_RECEIVED,
    # VERIFICATION_UPDATED, ESCALATED, RESOLVED, PUBLICATION_CHANGED
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    relevant_entity = Column(String, nullable=True)
    evidence_reference = Column(String, nullable=True)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class CitizenReportVerification(Base):
    """
    Structured verification record establishing factual status of observations.
    Mandatory distinction: WHAT_WAS_REPORTED vs WHAT_WAS_OBSERVED vs WHAT_SYSTEM_SHOWS vs WHAT_MODEL_SUGGESTS.
    """
    __tablename__ = "citizen_report_verifications"

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, index=True, nullable=False)
    verification_status = Column(String, index=True, nullable=False) # UNVERIFIED, PARTIALLY_VERIFIED, VERIFIED_OBSERVATION, OFFICIAL_CONFIRMED
    verification_method = Column(String, nullable=False) # VISUAL_REVIEW, CROSS_CHECKED_SYSTEM_DATA, MULTIPLE_REPORTS, FIELD_VERIFICATION, OFFICIAL_SOURCE, OTHER
    verified_by = Column(String, nullable=False)
    verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)
    structured_assessment = Column(JSON, default=dict) # what_was_reported, what_was_observed, what_system_data_shows, what_model_suggests, what_is_unknown, what_should_be_verified
    official_source_evidence = Column(Text, nullable=True) # Mandatory if status is OFFICIAL_CONFIRMED


class CitizenReportInfoRequest(Base):
    """
    Information request to citizen / follow-up record.
    """
    __tablename__ = "citizen_report_info_requests"

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, index=True, nullable=False)
    request_type = Column(String, nullable=False) # CONFIRM_LOCATION, CONFIRM_OBSERVATION_TIME, UPLOAD_ANOTHER_PHOTO, DESCRIBE_WATER_DEPTH, CONFIRM_CONDITION_STILL_PRESENT, OTHER
    request_text = Column(Text, nullable=False)
    requested_by = Column(String, nullable=False)
    requested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="PENDING") # PENDING, RESPONDED, CANCELLED
    response_text = Column(Text, nullable=True)
    response_received_at = Column(DateTime(timezone=True), nullable=True)


class CitizenReportEscalation(Base):
    """
    Formal operational escalation to external or specialized response teams.
    """
    __tablename__ = "citizen_report_escalations"

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, index=True, nullable=False)
    escalation_reason = Column(Text, nullable=False)
    destination_team = Column(String, nullable=False) # REGIONAL_WATER_OFFICE, PROVINCIAL_DISASTER_PREVENTION, POLLUTION_CONTROL_CENTER_7, LOCAL_ADMIN_ORG
    urgency = Column(String, nullable=False) # URGENT, HIGH, NORMAL, LOW
    evidence_summary = Column(Text, nullable=False)
    status = Column(String, default="PENDING", index=True) # PENDING, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED
    escalated_by = Column(String, nullable=False)
    escalated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    acknowledged_by = Column(String, nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StaffUser(Base):
    """
    Internal back-office staff user for RBAC enforcement.
    """
    __tablename__ = "staff_users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    role = Column(String, index=True, nullable=False) # ADMIN, REVIEWER, OPERATOR, READ_ONLY
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MonitoringEvent(Base):
    """
    Monitoring Event (Master Spec Section 13).
    Represents an event or situation that may warrant monitoring or verification.
    It does NOT automatically mean confirmed pollution.
    """
    __tablename__ = "monitoring_events"

    id = Column(String, primary_key=True, index=True) # e.g. "MEV-20261008-001"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String, index=True, nullable=False)
    # Event types: ABNORMAL_WATER_COLOR, FOAM, ODOR_REPORT, FISH_KILL, OIL_LIKE_SURFACE, WASTE_OR_DEBRIS, FLOODING, UNUSUAL_WATER_CONDITION, OTHER_ENVIRONMENTAL_ANOMALY
    status = Column(String, default="ACTIVE", index=True) # ACTIVE, UNDER_VERIFICATION, ESCALATED, RESOLVED, CLOSED
    monitoring_priority = Column(String, default="MODERATE", index=True) # LOW, MODERATE, HIGH, VERY_HIGH
    district = Column(String, nullable=True, index=True)
    subdistrict = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_precision = Column(String, default="UNKNOWN") # EXACT, NEARBY, DISTRICT, PROVINCE, UNKNOWN
    waterway_name = Column(String, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    source_summary = Column(Text, nullable=True)
    publication_status = Column(String, default="PUBLIC_SAFE", index=True)
    
    # Explainable priority & structured findings
    priority_factors = Column(JSON, default=list) # List of explainable contributing factors
    what_was_reported = Column(Text, nullable=True)
    what_was_observed = Column(Text, nullable=True)
    what_system_shows = Column(Text, nullable=True)
    what_is_unknown = Column(Text, nullable=True)
    what_should_be_verified = Column(Text, nullable=True)
    
    # Metadata & Provenance
    created_by = Column(String, nullable=False) # Staff username
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime(timezone=True), nullable=True)
    provenance = Column(JSON, nullable=False)


class ExternalEvidence(Base):
    """
    External Evidence (Master Spec Section 4.1 & 22).
    Provenance-preserving model for manual/operator-submitted public external information.
    Separated strictly from CitizenReport.
    """
    __tablename__ = "external_evidence"

    id = Column(String, primary_key=True, index=True) # e.g. "EVD-20261008-XXXX"
    source_platform = Column(String, nullable=False, index=True) # ONLINE_NEWS, FACEBOOK, X_TWITTER, LOCAL_COMMUNITY, OFFICIAL_PUBLIC, PUBLIC_DOCUMENT, OTHER
    source_name = Column(String, nullable=False) # Name of publisher / outlet / page
    source_url = Column(Text, nullable=False) # Canonical source URL
    
    # Provenance Timestamps (Strictly separated per Section 6 & 8)
    published_at = Column(DateTime(timezone=True), nullable=True, index=True) # Time published by source
    observed_at = Column(DateTime(timezone=True), nullable=True, index=True)  # Time event was observed
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)) # Time operator logged it
    
    title_or_summary = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    text_excerpt = Column(Text, nullable=True)
    
    # Taxonomies (Section 7 & 8)
    event_type = Column(String, nullable=False, index=True) # ABNORMAL_WATER_COLOR, FOAM, ODOR_REPORT, FISH_KILL, OIL_LIKE_SURFACE, WASTE_OR_DEBRIS, FLOODING, UNUSUAL_WATER_CONDITION, OTHER_ENVIRONMENTAL_ANOMALY
    evidence_type = Column(String, nullable=False, index=True) # PHOTO, VIDEO, NEWS_ARTICLE, SOCIAL_POST, OFFICIAL_POST, PUBLIC_DOCUMENT, OTHER
    
    # Verification & Publication States (Section 9 & 10)
    verification_status = Column(String, default="UNVERIFIED", index=True) # UNVERIFIED, CORROBORATED, OFFICIAL_VERIFIED, LAB_CONFIRMED, DISPUTED, REJECTED, STALE
    publication_status = Column(String, default="INTERNAL_ONLY", index=True) # PUBLIC, PUBLIC_SAFE, INTERNAL_ONLY, WITHHELD, HIDDEN, REJECTED
    
    # Geospatial location (Section 5 & 7)
    location_text = Column(String, nullable=True) # Stated textual location
    latitude = Column(Float, nullable=True) # Null if UNKNOWN or not exact
    longitude = Column(Float, nullable=True)
    location_precision = Column(String, default="UNKNOWN", index=True) # EXACT, NEARBY, DISTRICT, PROVINCE, UNKNOWN
    district = Column(String, nullable=True, index=True)
    subdistrict = Column(String, nullable=True)
    
    # Provenance Hash & Deduplication Integrity (Sections 6, 7 & 14)
    content_hash = Column(String, nullable=False, index=True) # SHA256 of canonical fields
    parent_evidence_id = Column(String, nullable=True, index=True) # References original source if reposted/copied
    source_group_id = Column(String, nullable=True, index=True) # Clusters reposts/mirrors to prevent priority inflation
    is_duplicate = Column(Boolean, default=False, index=True)
    duplicate_reason = Column(String, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    
    # Reviewer & Operator Context
    submitted_by = Column(String, nullable=False) # Staff username
    submitter_notes = Column(Text, nullable=True)
    reviewed_by = Column(String, nullable=True) # Staff username
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    official_source_evidence = Column(Text, nullable=True) # Required for OFFICIAL_VERIFIED
    
    # Link to Monitoring Event
    monitoring_event_id = Column(String, nullable=True, index=True)
    
    # Lifecycle
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    provenance = Column(JSON, nullable=False)


class ExternalEvidenceMedia(Base):
    """
    External Evidence Media Reference (Master Spec Section 4.2 & 23).
    Stores references and metadata to avoid unauthorized permanent storage of third-party copyright media.
    """
    __tablename__ = "external_evidence_media"

    id = Column(String, primary_key=True, index=True)
    evidence_id = Column(String, index=True, nullable=False)
    media_type = Column(String, nullable=False) # PHOTO, VIDEO, DOCUMENT
    source_media_url = Column(Text, nullable=False)
    sha256 = Column(String, nullable=True, index=True)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    storage_reference = Column(String, nullable=True) # Optional internal storage path if licensed
    storage_policy = Column(String, default="REFERENCE_ONLY", nullable=True)
    license_or_permission_status = Column(String, default="VIEW_AT_SOURCE_ONLY") # VIEW_AT_SOURCE_ONLY, FAIR_USE_THUMBNAIL, PERMISSION_GRANTED, UNKNOWN
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class EvidenceEventLink(Base):
    """
    M:N or 1:N Linkage between External Evidence and Monitoring Events (Master Spec Section 4 & 13).
    Also models event_evidence in ERD.
    """
    __tablename__ = "evidence_event_links"

    id = Column(String, primary_key=True, index=True)
    evidence_id = Column(String, index=True, nullable=False)
    event_id = Column(String, index=True, nullable=False)
    link_type = Column(String, default="PRIMARY_OBSERVATION") # PRIMARY_OBSERVATION, CORROBORATING_SIGNAL, HISTORICAL_CONTEXT, BACKGROUND
    relation_type = Column(String, default="PRIMARY_EVIDENCE") # PRIMARY_EVIDENCE, SUPPORTING_EVIDENCE, RELATED_REPORT, CONTRADICTING_EVIDENCE
    independence_group = Column(String, nullable=True, index=True)
    relevance_score = Column(Float, default=1.0) # 0.0 to 1.0
    linked_by = Column(String, nullable=False) # Staff username
    linked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)


class ExternalEvidenceAuditLog(Base):
    """
    Append-only immutable audit log of all external evidence operations (Master Spec Section 11 & 37).
    """
    __tablename__ = "external_evidence_audit_logs"

    audit_id = Column(String, primary_key=True, index=True)
    evidence_id = Column(String, index=True, nullable=False)
    actor_id = Column(String, nullable=False) # Staff username or id
    actor_role = Column(String, nullable=False) # ADMIN, REVIEWER, OPERATOR, READ_ONLY
    action = Column(String, index=True, nullable=False) # CREATED, REVIEWED, VERIFICATION_UPDATED, PUBLICATION_UPDATED, LINKED_TO_EVENT, UNLINKED, EDITED, REJECTED, MARKED_STALE
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class ExternalEvidenceAnalysis(Base):
    """
    Optional future AI / algorithmic analysis model (Master Spec Section 4.3 & 34).
    Must remain strictly separate from human-verified information.
    """
    __tablename__ = "external_evidence_analyses"

    id = Column(String, primary_key=True, index=True)
    evidence_id = Column(String, index=True, nullable=False)
    analysis_version = Column(String, nullable=False)
    detected_event_type = Column(String, nullable=True)
    detected_location = Column(String, nullable=True)
    detected_time = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(Float, nullable=True)
    detected_entities = Column(JSON, default=dict)
    raw_result = Column(JSON, default=dict)
    analysis_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class EventStatusHistory(Base):
    """
    Audit log of monitoring event status transitions (ERD 2.1).
    """
    __tablename__ = "event_status_history"

    id = Column(String, primary_key=True, index=True)
    event_id = Column(String, index=True, nullable=False)
    status = Column(String, nullable=False)
    changed_by = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class EvidenceLocation(Base):
    """
    Detailed location records for multi-point or polygon evidence (ERD 2.1).
    """
    __tablename__ = "evidence_locations"

    id = Column(String, primary_key=True, index=True)
    evidence_id = Column(String, index=True, nullable=False)
    location_type = Column(String, nullable=False) # POINT, DISTRICT, AREA
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address_text = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ExternalInformation(Base):
    """
    Event-Centric Multi-Source Information Entity (Sections 3, 23, 25, 44).
    Represents normalized public information (Official Data, Official Announcements,
    News Media, Public Social, and Citizen Observations) correlated with Monitoring Events.
    Preserves strict separation between:
    - Information vs. Raw Evidence
    - Authority Level vs. Verification Status vs. Event Relevance
    - Temporal Alignment vs. Causal Inference
    """
    __tablename__ = "external_information"

    id = Column(String, primary_key=True, index=True) # e.g. "INF-20261008-0001"
    source_id = Column(String, index=True, nullable=False) # References SourceRegistry source_id
    source_name = Column(String, nullable=False)
    source_type = Column(String, index=True, nullable=False) # OFFICIAL_DATA, OFFICIAL_ANNOUNCEMENT, GOVERNMENT_WEBSITE, NEWS_MEDIA, PUBLIC_SOCIAL, CITIZEN_OBSERVATION, OTHER_PUBLIC_SOURCE
    authority_level = Column(String, index=True, nullable=False) # OFFICIAL, PRIMARY, SECONDARY, PUBLIC, UNVERIFIED
    source_platform = Column(String, nullable=False)
    source_domain = Column(String, nullable=True)
    source_url = Column(Text, nullable=False)
    canonical_url = Column(Text, nullable=True)

    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    factual_details = Column(Text, nullable=True)

    # Provenance Timestamps (Strictly separated per Section 31)
    published_at = Column(DateTime(timezone=True), nullable=True, index=True)
    observed_at = Column(DateTime(timezone=True), nullable=True, index=True)
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Geospatial location & precision
    district = Column(String, nullable=True, index=True)
    subdistrict = Column(String, nullable=True)
    location_text = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_precision = Column(String, default="UNKNOWN", index=True) # EXACT, NEARBY, DISTRICT, PROVINCE, UNKNOWN

    # Source Image extraction (Sections 16, 17, 18)
    source_image_url = Column(Text, nullable=True)
    image_source_type = Column(String, default="NONE") # OG_IMAGE, TWITTER_IMAGE, SOURCE_IMAGE, PDF_PREVIEW, NONE, FALLBACK
    source_image_fetched_at = Column(DateTime(timezone=True), nullable=True)

    # Deduplication & Hash (Section 24)
    content_hash = Column(String, nullable=False, index=True)
    source_group_id = Column(String, nullable=True, index=True)
    is_duplicate = Column(Boolean, default=False, index=True)
    duplicate_reason = Column(String, nullable=True)

    # Verification & Relevance (Sections 9, 10, 11, 15)
    verification_status = Column(String, default="UNVERIFIED", index=True) # OFFICIAL_VERIFIED, CORROBORATED, UNVERIFIED, DISPUTED, REJECTED, WITHHELD
    spatial_relevance = Column(String, default="UNKNOWN", index=True) # EXACT, NEARBY, DISTRICT, PROVINCE, UNKNOWN
    temporal_relevance = Column(String, default="UNKNOWN", index=True) # TEMPORAL_ALIGNMENT, OUTSIDE_WINDOW, UNKNOWN
    event_relevance = Column(String, default="UNRELATED", index=True) # HIGH, MEDIUM, LOW, UNRELATED, CONTRADICTING
    correlation_reasons = Column(JSON, default=list) # List of explainable correlation reasons

    # AI separation (Section 12, 62)
    ai_confidence = Column(Float, nullable=True)

    # Publication & Privacy status (Section 26, 27)
    publication_status = Column(String, default="PUBLIC_SAFE", index=True) # PUBLIC, PUBLIC_SAFE, INTERNAL_ONLY, WITHHELD, REJECTED

    # Link to Monitoring Event (Section 8, 22)
    monitoring_event_id = Column(String, nullable=True, index=True)

    # Operational source health & Demo isolation (Sections 8, 26)
    source_status = Column(String, default="AVAILABLE", index=True) # AVAILABLE, UNAVAILABLE, TIMEOUT, DNS_ERROR, BLOCKED, RATE_LIMITED, NOT_CONFIGURED, PENDING_REVIEW, DEMO
    is_demo = Column(Boolean, default=False, index=True) # Strict quarantine: demo fixtures NEVER appear in public feed

    # Conflict / Contradiction handling (Section 39)
    contradiction_note = Column(Text, nullable=True)

    # Timestamps & Provenance
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    provenance = Column(JSON, nullable=False)






