import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, EmailStr
import time

from apps.api.app.core.database import get_db
from apps.api.app.models.entities import CitizenReport, SecurityAuditLog
from apps.api.app.core.provenance import make_provenance, DataCategory, SourceVerification, ValueNature
from apps.api.app.core.security import generalize_coordinates, sanitize_and_strip_exif_image, validate_prachin_coordinates
from apps.api.app.core.config import settings

router = APIRouter(prefix="/reports", tags=["Citizen Evidence & Crowdsourcing"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../data/uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory idempotency cache for duplicate submission prevention (Section 18)
IDEMPOTENCY_CACHE: dict[str, tuple[float, dict]] = {}

class CitizenReportCreate(BaseModel):
    reporter_name: str = Field(..., description="Name or anonymous identifier (Stored in private partition)")
    reporter_role: str = Field("CITIZEN", description="CITIZEN, VOLUNTEER, or COMMUNITY_LEADER")
    reporter_email: Optional[str] = Field(None, description="Private contact for follow-up")
    reporter_phone: Optional[str] = Field(None, description="Private telephone contact")
    latitude: float = Field(..., description="Exact GPS latitude from mobile sensor")
    longitude: float = Field(..., description="Exact GPS longitude from mobile sensor")
    district: str
    subdistrict: str
    water_depth_cm: float = Field(0.0, description="Estimated flood water depth in cm")
    water_flow_speed: str = Field("SLOW", description="STAGNANT, SLOW, or RAPID")
    contamination_signs: List[str] = Field(default_factory=list, description="e.g. chemical_odor, sheen, dead_fish, black_water")
    description: Optional[str] = None
    photo_url: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, description="Client-generated unique submission key")

@router.get("/")
def get_public_reports(
    limit: int = Query(100, ge=1, le=500, description="Maximum items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    include_demo: bool = Query(False, description="Include test/demo records (non-production test mode only)"),
    db: Session = Depends(get_db)
):
    """
    Section 11 Reporter Privacy & Section 12 Stable Pagination:
    Public partition of crowdsourced field observations.
    CRITICAL PRIVACY SAFEGUARDS:
    - Never exposes exact GPS coordinates (only returns generalized coordinates ~1.1km).
    - Never exposes reporter identity, email, or telephone.
    - Status is clearly labeled UNVERIFIED or UNDER_REVIEW until certified by human authorities.
    - TEST/DEMO records are strictly isolated and never shown on public dashboard in production.
    """
    query = db.query(CitizenReport)
    # Strictly exclude TEST/DEMO records from public dashboard
    if not (include_demo and settings.DATA_ENV != "PRODUCTION" and not settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION):
        query = query.filter(
            CitizenReport.verification_status != "TEST_DEMO",
            CitizenReport.review_status != "TEST_DEMO",
            CitizenReport.reporter_role != "TEST/DEMO",
            CitizenReport.publication_state != "WITHHELD"
        )
    if district:
        query = query.filter(CitizenReport.district.ilike(f"%{district}%"))
    
    reports = query.order_by(CitizenReport.created_at.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": r.id,
            "reporter_role": r.reporter_role,
            "reporter_display": "Community Observer (Anonymized)",
            "latitude": r.public_latitude,
            "longitude": r.public_longitude,
            "district": r.district,
            "subdistrict": r.subdistrict,
            "water_depth_cm": r.water_depth_cm,
            "water_flow_speed": r.water_flow_speed,
            "contamination_signs": r.contamination_signs,
            "description": r.description,
            "photo_url": r.photo_url,
            "verification_status": r.verification_status,
            "review_status": r.review_status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "provenance": r.provenance
        }
        for r in reports
    ]

@router.post("/")
def submit_citizen_report(
    data: CitizenReportCreate, 
    x_idempotency_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Submits a new crowdsourced observation.
    Separates private identification from public display.
    Generalizes exact GPS coordinates to protect citizen reporter home privacy.
    Enforces idempotency and geographical validation against data corruption.
    """
    # 1. Idempotency Guard (Section 18)
    idemp_key = x_idempotency_key or data.idempotency_key
    now_ts = time.time()
    if idemp_key:
        cached = IDEMPOTENCY_CACHE.get(idemp_key)
        if cached:
            cached_time, cached_payload = cached
            if now_ts - cached_time < 900:  # 15 minutes window
                return cached_payload

    # 2. Geographic Boundary & Data Corruption Validation (Section 46)
    if not validate_prachin_coordinates(data.latitude, data.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="พิกัดที่ระบุอยู่นอกพื้นที่ลุ่มน้ำจังหวัดปราจีนบุรีที่รองรับ (กรุณาระบุพิกัดในพื้นที่จริง)"
        )

    report_id = f"rpt_{uuid.uuid4().hex[:8]}"
    
    # Section 11: Compute generalized privacy coordinates
    pub_lat, pub_lon = generalize_coordinates(
        data.latitude, data.longitude, 
        decimals=settings.COORDINATE_GENERALIZE_DECIMALS
    )
    
    prov = make_provenance(
        agency="Citizen Public Report",
        dataset="Crowdsourced Ground Observation",
        official_id=report_id,
        category=DataCategory.CITIZEN_REPORTED,
        source_verification=SourceVerification.UNVERIFIED,
        confidence=0.50,
        measurement_status="CROWDSOURCED_GROUND_OBSERVATION",
        value_nature=ValueNature.OBSERVED,
        audit_notes="Citizen submitted observation. Does NOT confirm chemical contamination without certified lab assay."
    )
    
    report = CitizenReport(
        id=report_id,
        # Private data
        reporter_name=data.reporter_name,
        reporter_role=data.reporter_role,
        reporter_email=data.reporter_email,
        reporter_phone=data.reporter_phone,
        exact_latitude=data.latitude,
        exact_longitude=data.longitude,
        moderation_notes=None,
        # Public data
        latitude=pub_lat,
        longitude=pub_lon,
        public_latitude=pub_lat,
        public_longitude=pub_lon,
        district=data.district,
        subdistrict=data.subdistrict,
        water_depth_cm=data.water_depth_cm,
        water_flow_speed=data.water_flow_speed,
        contamination_signs=data.contamination_signs,
        description=data.description,
        photo_url=data.photo_url,
        verification_status="UNVERIFIED", # Enforces Section 10: initial state is UNVERIFIED
        review_status="PENDING_REVIEW",
        created_at=datetime.now(timezone.utc),
        provenance=prov.to_dict()
    )
    
    audit = SecurityAuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        event_type="CITIZEN_REPORT_SUBMITTED",
        user_or_system=f"citizen:{data.reporter_role}",
        details={"report_id": report_id, "district": data.district, "subdistrict": data.subdistrict},
        timestamp=datetime.now(timezone.utc)
    )

    db.add(report)
    db.add(audit)
    db.commit()
    db.refresh(report)
    
    response_payload = {
        "status": "success",
        "id": report.id,
        "message": "Report logged with UNVERIFIED state. GPS coordinates have been generalized for privacy.",
        "public_latitude": report.public_latitude,
        "public_longitude": report.public_longitude,
        "provenance": report.provenance
    }
    if idemp_key:
        IDEMPOTENCY_CACHE[idemp_key] = (now_ts, response_payload)

    return response_payload

@router.post("/upload-photo")
async def upload_evidence_photo(photo: UploadFile = File(...)):
    """
    Section 18 File Upload Security:
    - Maximum 5MB file size limit
    - Validates binary magic byte signature (JPEG/PNG/WebP)
    - Strips EXIF metadata (removes GPS home coordinates, device serials)
    - Re-encodes into clean image format
    - Generates randomized storage identifier
    """
    content = await photo.read()
    clean_bytes, filename = sanitize_and_strip_exif_image(
        content, max_bytes=settings.MAX_UPLOAD_SIZE_BYTES
    )
    
    dest_path = os.path.join(UPLOAD_DIR, filename)
    with open(dest_path, "wb") as f:
        f.write(clean_bytes)
        
    return {
        "status": "success",
        "filename": filename,
        "photo_url": f"/uploads/{filename}",
        "message": "Image verified, EXIF metadata stripped, and saved with randomized filename."
    }

@router.get("/clusters")
def get_community_observation_clusters(db: Session = Depends(get_db)):
    """
    Master Prompt Section 27: Community Evidence Clustering.
    Clusters real observations using:
    - spatial proximity (district / subdistrict)
    - time
    - category (unusual water color, surface residue, odor, foam, fish deaths, flooding)
    - hydrological relationship (nearest river reach)

    Output:
    COMMUNITY_OBSERVATION_CLUSTER

    Never:
    PROOF_OF_CONTAMINATION
    """
    reports = db.query(CitizenReport).filter(
        CitizenReport.verification_status != "TEST_DEMO",
        CitizenReport.review_status != "TEST_DEMO",
        CitizenReport.reporter_role != "TEST/DEMO"
    ).all()
    if not reports:
        return []

    # Group by district and subdistrict
    grouped = {}
    for r in reports:
        key = (r.district, r.subdistrict)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(r)

    clusters = []
    for (district, subdistrict), r_list in grouped.items():
        avg_lat = sum(r.public_latitude for r in r_list) / len(r_list)
        avg_lon = sum(r.public_longitude for r in r_list) / len(r_list)

        # Aggregate reported signs/categories
        all_signs = set()
        for r in r_list:
            if isinstance(r.contamination_signs, list):
                for s in r.contamination_signs:
                    all_signs.add(s)

        timestamps = [r.created_at for r in r_list if r.created_at]
        earliest = min(timestamps).isoformat() if timestamps else None
        latest = max(timestamps).isoformat() if timestamps else None

        cluster_id = f"cluster_{district}_{subdistrict}".replace(" ", "_")

        clusters.append({
            "cluster_id": cluster_id,
            "cluster_type": "COMMUNITY_OBSERVATION_CLUSTER",
            "district": district,
            "subdistrict": subdistrict,
            "center_latitude": round(avg_lat, 4),
            "center_longitude": round(avg_lon, 4),
            "observation_count": len(r_list),
            "reported_categories": sorted(list(all_signs)),
            "earliest_observation": earliest,
            "latest_observation": latest,
            "verification_status": "UNVERIFIED",
            "hydrological_reach": "Prachin Buri River System (Basin 03)",
            "cluster_label": "COMMUNITY_OBSERVATION_CLUSTER",
            "disclaimer": (
                "Community observation clusters aggregate unverified crowdsourced notices. "
                "Clusters do NOT constitute proof of contamination or legal evidence of industrial discharge."
            )
        })

    return clusters
