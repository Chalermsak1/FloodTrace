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
    """
    __tablename__ = "water_level_observations"

    id = Column(String, primary_key=True, index=True) # UUID or composite
    station_id = Column(String, index=True, nullable=False)
    water_level_msl = Column(Float, nullable=True) # MEASURED_FACT (meters MSL)
    source_timestamp = Column(DateTime(timezone=True), index=True, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
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
    """
    __tablename__ = "rainfall_observations"

    id = Column(String, primary_key=True, index=True) # UUID or composite
    station_id = Column(String, index=True, nullable=False)
    rain_24h_mm = Column(Float, nullable=True) # MEASURED_FACT (mm)
    rain_1h_mm = Column(Float, nullable=True)
    source_timestamp = Column(DateTime(timezone=True), index=True, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
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


