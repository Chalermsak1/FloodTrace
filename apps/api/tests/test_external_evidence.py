"""
Comprehensive Verification Test Suite for External Evidence System (Master Spec Section 36)
Covers:
- Database creation, retrieval, updates, and constraints
- Provenance, distinct timestamps, and location precision
- Review workflow, RBAC authorization, and validation rules
- Official verified and lab confirmed strict requirements
- Deterministic spatial, temporal, and waterway correlation
- Monitoring event linkage and Evidence Packet generation
- Monitoring Priority surface integration and safety rules
- Strict separation: External Evidence NEVER counted as Citizen Report
- Public endpoint sanitization and privacy protection
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.models.entities import (
    ExternalEvidence,
    ExternalEvidenceMedia,
    ExternalEvidenceAuditLog,
    MonitoringEvent,
    EvidenceEventLink,
    CitizenReport,
    StaffUser,
    ExternalInformation
)
from apps.api.app.core.staff_rbac import StaffPrincipal, StaffRole
from apps.api.app.services.external_evidence_service import (
    ExternalEvidenceService,
    normalize_source_url,
    extract_platform_post_id
)
from apps.api.app.schemas.external_evidence import (
    ExternalEvidenceCreate,
    ExternalEvidenceReviewRequest,
    LinkMonitoringEventRequest,
    MonitoringEventCreate,
    LocationPrecisionEnum,
    EventTypeEnum,
    EvidenceTypeEnum,
    SourcePlatformEnum,
    PublicationStatusEnum,
    VerificationStatusEnum,
    RelationTypeEnum
)

from apps.api.app.core.database import SessionLocal

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

ADMIN_HEADERS = {
    "X-Admin-Key": settings.ADMIN_API_KEY,
    "X-Staff-User": "admin_user",
    "X-Staff-Role": "ADMIN"
}

REVIEWER_HEADERS = {
    "X-Admin-Key": settings.ADMIN_API_KEY,
    "X-Staff-User": "reviewer_01",
    "X-Staff-Role": "REVIEWER"
}

OPERATOR_HEADERS = {
    "X-Admin-Key": settings.ADMIN_API_KEY,
    "X-Staff-User": "operator_01",
    "X-Staff-Role": "OPERATOR"
}

READ_ONLY_HEADERS = {
    "X-Admin-Key": settings.ADMIN_API_KEY,
    "X-Staff-User": "readonly_01",
    "X-Staff-Role": "READ_ONLY"
}

OPERATOR_STAFF = StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")


# ==============================================================================
# 1. Database Model & Provenance Tests
# ==============================================================================

def test_create_external_evidence_provenance_and_timestamps(db_session: Session):
    """Verifies intake creates item with distinct timestamps, content hash, and initial UNVERIFIED state."""
    pub_time = datetime(2026, 10, 8, 9, 0, tzinfo=timezone.utc)
    obs_time = datetime(2026, 10, 8, 8, 30, tzinfo=timezone.utc)

    payload = {
        "source_platform": "ONLINE_NEWS",
        "source_name": "Prachin Buri Local News",
        "source_url": "https://prachinnews.example.com/water-change-2026",
        "published_at": pub_time.isoformat(),
        "observed_at": obs_time.isoformat(),
        "title_or_summary": "พบน้ำมีสีเข้มผิดปกติในคลองสาขา",
        "description": "ชาวบ้านรายงานพบน้ำมีสีคล้ำและมีฟองขาวลอยผิวน้ำบริเวณใกล้สะพานข้ามคลอง",
        "event_type": "ABNORMAL_WATER_COLOR",
        "evidence_type": "PHOTO",
        "location_text": "ใกล้สะพานข้ามคลอง ต.กบินทร์ อ.กบินทร์บุรี",
        "latitude": 13.9876,
        "longitude": 101.7214,
        "location_precision": "EXACT",
        "district": "กบินทร์บุรี",
        "subdistrict": "กบินทร์",
        "media_references": [
            {
                "media_type": "PHOTO",
                "source_media_url": "https://prachinnews.example.com/images/water1.jpg",
                "license_or_permission_status": "VIEW_AT_SOURCE_ONLY"
            }
        ]
    }

    resp = client.post("/api/internal/external-evidence", json=payload, headers=OPERATOR_HEADERS)
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    evidence_id = data["evidence_id"]
    assert data["verification_status"] == "UNVERIFIED"
    assert data["publication_status"] == "INTERNAL_ONLY"
    assert "content_hash" in data

    # Verify directly from DB
    ev = db_session.query(ExternalEvidence).filter(ExternalEvidence.id == evidence_id).first()
    assert ev is not None
    assert ev.source_name == "Prachin Buri Local News"
    assert ev.published_at == pub_time
    assert ev.observed_at == obs_time
    assert ev.location_precision == "EXACT"
    assert ev.provenance is not None
    assert "audit_notes" in ev.provenance

    # Verify audit log was recorded
    audit = db_session.query(ExternalEvidenceAuditLog).filter(ExternalEvidenceAuditLog.evidence_id == evidence_id).first()
    assert audit is not None
    assert audit.action == "CREATED"
    assert audit.actor_id == "operator_01"


def test_unknown_location_never_forces_fake_coordinates(db_session: Session):
    """Verifies that UNKNOWN or PROVINCE-level precision never invents coordinates (Section 5 & 31)."""
    payload = {
        "source_platform": "FACEBOOK",
        "source_name": "ชุมชนปราจีนบุรีรวมใจ",
        "source_url": "https://facebook.com/prachincommunity/posts/12345",
        "title_or_summary": "มีกลิ่นผิดปกติไม่ทราบจุดแน่ชัดในจังหวัด",
        "event_type": "ODOR_REPORT",
        "evidence_type": "SOCIAL_POST",
        "location_text": "ไม่ทราบพิกัดแน่ชัด ทราบเพียงเกิดใน จ.ปราจีนบุรี",
        "location_precision": "UNKNOWN"
    }

    resp = client.post("/api/internal/external-evidence", json=payload, headers=OPERATOR_HEADERS)
    assert resp.status_code == 201
    ev_id = resp.json()["evidence_id"]

    ev = db_session.query(ExternalEvidence).filter(ExternalEvidence.id == ev_id).first()
    assert ev.latitude is None
    assert ev.longitude is None
    assert ev.location_precision == "UNKNOWN"


# ==============================================================================
# 2. Security & RBAC Tests
# ==============================================================================

def test_unauthenticated_access_rejected():
    """Unauthenticated requests must be rejected with 401."""
    resp = client.post("/api/internal/external-evidence", json={})
    assert resp.status_code == 401


def test_read_only_staff_cannot_create_or_review():
    """READ_ONLY role cannot mutate evidence state."""
    payload = {
        "source_platform": "ONLINE_NEWS",
        "source_name": "Test News",
        "source_url": "https://news.example.com/test",
        "title_or_summary": "Test title",
        "event_type": "FOAM",
        "evidence_type": "PHOTO"
    }
    resp = client.post("/api/internal/external-evidence", json=payload, headers=READ_ONLY_HEADERS)
    assert resp.status_code == 403


def test_ssrf_url_validation_rejects_internal_targets():
    """Rejects localhost and internal IP addresses in source_url."""
    payload = {
        "source_platform": "ONLINE_NEWS",
        "source_name": "Malicious Test",
        "source_url": "http://127.0.0.1:8000/internal-leak",
        "title_or_summary": "Test",
        "event_type": "FLOODING",
        "evidence_type": "PHOTO"
    }
    resp = client.post("/api/internal/external-evidence", json=payload, headers=OPERATOR_HEADERS)
    assert resp.status_code == 422 or resp.status_code == 400


# ==============================================================================
# 3. Human Review Workflow Tests
# ==============================================================================

def test_review_accept_and_corroborate(db_session: Session):
    """Reviewer can accept and corroborate evidence."""
    # Create evidence
    ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Local News Kabin",
            source_url="https://kabinnews.example.com/article1",
            title_or_summary="พบคราบฟองลอยในแม่น้ำปราจีนบุรี",
            event_type=EventTypeEnum.FOAM,
            evidence_type=EvidenceTypeEnum.PHOTO,
            location_precision=LocationPrecisionEnum.DISTRICT,
            district="กบินทร์บุรี"
        ),
        staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )

    # Review to CORROBORATED and PUBLIC
    review_resp = client.post(
        f"/api/internal/external-evidence/{ev.id}/review",
        json={
            "action": "CORROBORATE",
            "publication_status": "PUBLIC",
            "reason": "สอดคล้องกับรายงานข้อสังเกตจากชาวบ้านและระดับน้ำโทรมาตร",
            "reviewer_notes": "ยืนยันความน่าเชื่อถือของแหล่งข่าว"
        },
        headers=REVIEWER_HEADERS
    )
    assert review_resp.status_code == 200
    rev_data = review_resp.json()
    assert rev_data["verification_status"] == "CORROBORATED"
    assert rev_data["publication_status"] == "PUBLIC"


def test_official_verified_requires_official_evidence_document(db_session: Session):
    """OFFICIAL_VERIFIED must fail if official document evidence citation is missing."""
    ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.LOCAL_COMMUNITY,
            source_name="Community Post",
            source_url="https://community.example.com/p/1",
            title_or_summary="พบปลาตายริมตลิ่ง",
            event_type=EventTypeEnum.FISH_KILL,
            evidence_type=EvidenceTypeEnum.PHOTO
        ),
        staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )

    # Attempt without official document citation -> Must Fail
    resp = client.post(
        f"/api/internal/external-evidence/{ev.id}/review",
        json={
            "action": "VERIFY_OFFICIAL",
            "reason": "พยายามยืนยันโดยไม่มีหนังสือราชการ"
        },
        headers=REVIEWER_HEADERS
    )
    assert resp.status_code == 400
    assert "หนังสือหรือหลักฐานจากหน่วยงานราชการ" in resp.json()["detail"]

    # Provide official document citation -> Must Succeed
    resp_ok = client.post(
        f"/api/internal/external-evidence/{ev.id}/review",
        json={
            "action": "VERIFY_OFFICIAL",
            "official_source_evidence": "หนังสือราชการ สสภ.7 ที่ ทส 0305/1234 รายงานการลงพื้นที่ตรวจสอบข้อเท็จจริง",
            "reason": "มีผลการตรวจสอบอย่างเป็นทางการจาก สสภ.7"
        },
        headers=REVIEWER_HEADERS
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["verification_status"] == "OFFICIAL_VERIFIED"


def test_lab_confirmed_strict_requirement(db_session: Session):
    """LAB_CONFIRMED requires certified laboratory assay data per Section 21."""
    ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Water Report",
            source_url="https://news.example.com/lab",
            title_or_summary="รายงานตรวจพบค่าสารเคมี",
            event_type=EventTypeEnum.ABNORMAL_WATER_COLOR,
            evidence_type=EvidenceTypeEnum.NEWS_ARTICLE
        ),
        staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )

    # Missing lab data -> Fail
    resp_fail = client.post(
        f"/api/internal/external-evidence/{ev.id}/review",
        json={
            "action": "CONFIRM_LAB",
            "reason": "อ้างว่ามีผลแล็บแต่ไม่แนบข้อมูล"
        },
        headers=ADMIN_HEADERS
    )
    assert resp_fail.status_code == 400

    # With full certified lab assay -> Succeed
    resp_ok = client.post(
        f"/api/internal/external-evidence/{ev.id}/review",
        json={
            "action": "CONFIRM_LAB",
            "reason": "ได้รับผลวิเคราะห์ตัวอย่างน้ำจากศูนย์วิจัยและพัฒนาสิ่งแวดล้อม",
            "lab_confirmation_data": {
                "laboratory": "กรมควบคุมมลพิษ (PCD Laboratory)",
                "sample_id": "PCD-PB-2026-088",
                "sample_date": "2026-10-08",
                "parameter": "Dissolved Oxygen (DO)",
                "result": "1.2",
                "unit": "mg/L",
                "method": "Azide Modification / EPA 360.2"
            }
        },
        headers=ADMIN_HEADERS
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["verification_status"] == "LAB_CONFIRMED"


# ==============================================================================
# 4. Monitoring Event Linkage & Evidence Packet Tests
# ==============================================================================

def test_link_evidence_to_monitoring_event_and_evidence_packet(db_session: Session):
    """Verifies linking evidence to a Monitoring Event updates factors and compiles Evidence Packet."""
    # 1. Create Monitoring Event
    evt_resp = client.post(
        "/api/internal/monitoring-events",
        json={
            "title": "เฝ้าระวังคุณภาพน้ำริมแม่น้ำปราจีนบุรี อ.ศรีมหาโพธิ",
            "description": "ติดตามการเปลี่ยนแปลงของสภาพน้ำและรายงานข้อสังเกต",
            "event_type": "ABNORMAL_WATER_COLOR",
            "district": "ศรีมหาโพธิ",
            "waterway_name": "แม่น้ำปราจีนบุรี"
        },
        headers=REVIEWER_HEADERS
    )
    assert evt_resp.status_code == 201
    evt_id = evt_resp.json()["event_id"]

    # 2. Create and review evidence
    ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="ปราจีนโพสต์",
            source_url="https://prachinpost.example.com/river-check",
            title_or_summary="ภาพถ่ายทางน้ำมีสีขุ่นคล้ำ",
            event_type=EventTypeEnum.ABNORMAL_WATER_COLOR,
            evidence_type=EvidenceTypeEnum.PHOTO,
            district="ศรีมหาโพธิ"
        ),
        staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )
    ev.publication_status = "PUBLIC_SAFE"
    db_session.commit()

    # 3. Link evidence to event
    link_resp = client.post(
        f"/api/internal/external-evidence/{ev.id}/link-event",
        json={"event_id": evt_id, "link_type": "PRIMARY_OBSERVATION", "relevance_score": 1.0},
        headers=REVIEWER_HEADERS
    )
    assert link_resp.status_code == 200
    assert link_resp.json()["event_id"] == evt_id

    # 4. Fetch Evidence Packet for event
    packet_resp = client.get(f"/api/public/monitoring-events/{evt_id}/evidence-packet")
    assert packet_resp.status_code == 200
    packet = packet_resp.json()

    assert "what_was_reported" in packet
    assert "what_was_observed" in packet
    assert "external_evidence" in packet
    assert packet["external_evidence"]["count"] >= 1
    assert "measured_data" in packet
    assert "what_the_system_suggests" in packet
    assert "what_is_unknown" in packet
    assert "what_should_be_verified" in packet
    assert "disclaimer" in packet


# ==============================================================================
# 5. Deterministic Correlation Tests
# ==============================================================================

def test_deterministic_correlation_engine(db_session: Session):
    """Tests spatial, temporal, and waterway correlation calculations."""
    now = datetime.now(timezone.utc)
    # Add a citizen report nearby
    test_cr_id = f"cr_test_corr_{uuid.uuid4().hex[:6]}"
    report = CitizenReport(
        id=test_cr_id,
        reporter_name="Citizen Tester",
        exact_latitude=13.9876,
        exact_longitude=101.7214,
        latitude=13.99,
        longitude=101.72,
        public_latitude=13.99,
        public_longitude=101.72,
        district="กบินทร์บุรี",
        subdistrict="กบินทร์",
        status="IN_REVIEW",
        publication_state="PUBLIC_SAFE_SUMMARY",
        verification_status="VERIFIED_OBSERVATION",
        observed_at=now - timedelta(hours=2),
        created_at=now - timedelta(hours=2),
        provenance={"category": "CITIZEN_REPORTED"}
    )
    db_session.add(report)
    db_session.commit()

    ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Kabin Community",
            source_url="https://fb.com/kabin/post1",
            published_at=now - timedelta(hours=1),
            observed_at=now - timedelta(hours=1),
            title_or_summary="น้ำมีกลิ่นและสีเข้ม",
            event_type=EventTypeEnum.ABNORMAL_WATER_COLOR,
            evidence_type=EvidenceTypeEnum.PHOTO,
            latitude=13.9876,
            longitude=101.7214,
            location_precision=LocationPrecisionEnum.EXACT,
            district="กบินทร์บุรี",
            subdistrict="กบินทร์"
        ),
        staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )

    corr_resp = client.get(f"/api/internal/external-evidence/{ev.id}/correlations", headers=REVIEWER_HEADERS)
    assert corr_resp.status_code == 200
    corr = corr_resp.json()

    assert corr["spatial_correlation"]["status"] == "LOCATED"
    assert corr["hydrological_correlation"]["in_river_corridor"] is True
    assert len(corr["citizen_reports_correlation"]) >= 1
    assert corr["correlation_strength"] in ("MODERATE", "HIGH")


# ==============================================================================
# 6. Safety Bounds & Citizen Report Separation
# ==============================================================================

def test_external_evidence_never_counted_as_citizen_report(db_session: Session):
    """External evidence must NEVER inflate citizen report counts (Section 12 & 36)."""
    initial_db_count = db_session.query(CitizenReport).count()
    initial_pub_overview_count = client.get("/api/public/overview").json()["total_citizen_reports"]

    # Create 3 external evidence items
    for i in range(3):
        ExternalEvidenceService.create_evidence(
            db=db_session,
            data=ExternalEvidenceCreate(
                source_platform=SourcePlatformEnum.ONLINE_NEWS,
                source_name=f"News Outlet {i}",
                source_url=f"https://news{i}.example.com",
                title_or_summary=f"Observation {i}",
                event_type=EventTypeEnum.FLOODING,
                evidence_type=EvidenceTypeEnum.PHOTO,
                district="บ้านสร้าง"
            ),
            staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
        )

    # Database count and overview endpoint citizen reports count must not change
    assert db_session.query(CitizenReport).count() == initial_db_count
    resp = client.get("/api/public/overview")
    assert resp.status_code == 200
    overview = resp.json()
    assert overview["total_citizen_reports"] == initial_pub_overview_count


def test_single_unverified_image_cannot_create_high_risk_zone(db_session: Session):
    """A single unverified external image CANNOT independently create a HIGH or VERY_HIGH priority zone (Section 27)."""
    # Create single unverified evidence with exact coordinates in quiet area
    ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Anonymous Page",
            source_url="https://fb.com/anon/post",
            title_or_summary="ภาพน้ำมีฟองขาว",
            event_type=EventTypeEnum.FOAM,
            evidence_type=EvidenceTypeEnum.PHOTO,
            latitude=13.8210,
            longitude=101.3920, # ศรีมโหสถ คู้ลำพัน
            location_precision=LocationPrecisionEnum.EXACT,
            district="ศรีมโหสถ",
            subdistrict="คู้ลำพัน"
        ),
        staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )

    resp = client.get("/api/public/map/monitoring-priority")
    assert resp.status_code == 200
    surface = resp.json()
    features = surface.get("features", [])

    sm_cell = next((f for f in features if f["properties"]["cell_id"] == "cell_sm_03"), None)
    assert sm_cell is not None
    # Must NOT be VERY_HIGH or HIGH from single unverified image
    assert sm_cell["properties"]["priority_level"] not in ("VERY_HIGH", "HIGH")
    assert sm_cell["properties"]["priority_score"] < 0.48


def test_public_filtering_and_privacy_protection(db_session: Session):
    """Public endpoints strictly withhold INTERNAL_ONLY, WITHHELD, and REJECTED items, and scrub PII."""
    ev_internal = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Internal Only News",
            source_url="https://secret.example.com",
            title_or_summary="Secret Internal Investigation",
            event_type=EventTypeEnum.ABNORMAL_WATER_COLOR,
            evidence_type=EvidenceTypeEnum.PHOTO,
            submitter_notes="Confidential operator notes containing internal staff details"
        ),
        staff=StaffPrincipal("staff_op", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )

    # 1. Fetch from public endpoint -> must NOT appear
    pub_list = client.get("/api/public/external-evidence").json()
    assert all(item["id"] != ev_internal.id for item in pub_list)

    # 2. Fetch direct by ID -> must 404
    resp_404 = client.get(f"/api/public/external-evidence/{ev_internal.id}")
    assert resp_404.status_code == 404

    # 3. Publish it
    ExternalEvidenceService.review_evidence(
        db=db_session,
        evidence_id=ev_internal.id,
        review_data=ExternalEvidenceReviewRequest(
            action="ACCEPT",
            publication_status=PublicationStatusEnum.PUBLIC,
            reason="Approved for public display"
        ),
        staff=StaffPrincipal("staff_admin", "admin_user", "Admin", StaffRole.ADMIN, "Admin", "admin@test.com")
    )

    # Now it appears publicly, but without submitter_notes or internal staff details
    resp_ok = client.get(f"/api/public/external-evidence/{ev_internal.id}")
    assert resp_ok.status_code == 200
    pub_data = resp_ok.json()
    assert "submitter_notes" not in pub_data
    assert "submitted_by" not in pub_data
    assert "reviewer_notes" not in pub_data


# ==============================================================================
# 7. Deduplication, Source Grouping & Priority Suppression Tests
# ==============================================================================

def test_duplicate_url_and_content_hash_detection(db_session: Session):
    """Submitting duplicate URL or duplicate payload links to parent and marks is_duplicate=True."""
    target_url = f"https://source.example.com/story-{uuid.uuid4().hex[:6]}"
    
    # 1. Primary intake
    res1 = client.post("/api/internal/external-evidence", json={
        "source_platform": "ONLINE_NEWS",
        "source_name": "News Site A",
        "source_url": target_url,
        "title_or_summary": "น้ำคลองมีคราบน้ำมัน",
        "description": "พบเห็นคราบคล้ายน้ำมันลอยผิวน้ำบริเวณกบินทร์บุรี",
        "event_type": "OIL_LIKE_SURFACE",
        "evidence_type": "NEWS_ARTICLE",
        "district": "กบินทร์บุรี"
    }, headers=OPERATOR_HEADERS)
    assert res1.status_code == 201
    ev1_id = res1.json()["evidence_id"]
    ev1 = db_session.query(ExternalEvidence).filter(ExternalEvidence.id == ev1_id).first()
    assert ev1.is_duplicate is False
    assert ev1.source_group_id is not None
    orig_group = ev1.source_group_id

    # 2. Duplicate intake with exact same URL
    res2 = client.post("/api/internal/external-evidence", json={
        "source_platform": "FACEBOOK",
        "source_name": "Aggregator Page",
        "source_url": target_url,
        "title_or_summary": "น้ำคลองมีคราบน้ำมัน (แชร์ต่อ)",
        "event_type": "OIL_LIKE_SURFACE",
        "evidence_type": "SOCIAL_POST",
        "district": "กบินทร์บุรี"
    }, headers=OPERATOR_HEADERS)
    assert res2.status_code == 201
    ev2_id = res2.json()["evidence_id"]
    ev2 = db_session.query(ExternalEvidence).filter(ExternalEvidence.id == ev2_id).first()
    assert ev2.is_duplicate is True
    assert ev2.parent_evidence_id == ev1_id
    assert ev2.source_group_id == orig_group
    assert "IDENTICAL_SOURCE_URL" in ev2.duplicate_reason


def test_priority_duplicate_suppression_prevents_inflation(db_session: Session):
    """Multiple duplicates/reposts do NOT artificially inflate Monitoring Priority (Section 14 & 19)."""
    # Create an event
    evt_resp = client.post(
        "/api/internal/monitoring-events",
        json={
            "title": "ทดสอบการลดทอนความสำคัญจากข้อมูลซ้ำซ้อน",
            "event_type": "FOAM",
            "district": "บ้านสร้าง"
        },
        headers=REVIEWER_HEADERS
    )
    evt_id = evt_resp.json()["event_id"]

    # Ingest 1 primary + 3 duplicates
    shared_url = f"https://news.example.com/foam-{uuid.uuid4().hex[:6]}"
    primary_ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Primary Local News",
            source_url=shared_url,
            title_or_summary="พบฟองขาว",
            event_type=EventTypeEnum.FOAM,
            evidence_type=EvidenceTypeEnum.PHOTO,
            district="บ้านสร้าง"
        ),
        staff=StaffPrincipal("op1", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )
    ExternalEvidenceService.link_to_monitoring_event(
        db=db_session,
        evidence_id=primary_ev.id,
        link_data=LinkMonitoringEventRequest(event_id=evt_id, link_type="PRIMARY_OBSERVATION"),
        staff=StaffPrincipal("rev1", "reviewer_01", "Reviewer", StaffRole.REVIEWER, "Triage", "rev@test.com")
    )

    packet_single = ExternalEvidenceService.get_evidence_packet_for_event(db_session, evt_id)
    assert packet_single["external_evidence"]["independent_count"] == 1
    assert packet_single["external_evidence"]["total_records"] == 1

    # Now ingest 3 reposts of the same URL and link them
    for i in range(3):
        dup_ev = ExternalEvidenceService.create_evidence(
            db=db_session,
            data=ExternalEvidenceCreate(
                source_platform=SourcePlatformEnum.FACEBOOK,
                source_name=f"Social Repost {i}",
                source_url=shared_url,
                title_or_summary=f"พบฟองขาว (แชร์ {i})",
                event_type=EventTypeEnum.FOAM,
                evidence_type=EvidenceTypeEnum.SOCIAL_POST,
                district="บ้านสร้าง"
            ),
            staff=StaffPrincipal("op1", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
        )
        ExternalEvidenceService.link_to_monitoring_event(
            db=db_session,
            evidence_id=dup_ev.id,
            link_data=LinkMonitoringEventRequest(event_id=evt_id, link_type="SUPPORTING_OBSERVATION"),
            staff=StaffPrincipal("rev1", "reviewer_01", "Reviewer", StaffRole.REVIEWER, "Triage", "rev@test.com")
        )

    packet_multi = ExternalEvidenceService.get_evidence_packet_for_event(db_session, evt_id)
    # Total records increased to 4, but independent sources remains strictly 1!
    assert packet_multi["external_evidence"]["total_records"] == 4
    assert packet_multi["external_evidence"]["independent_count"] == 1


def test_temporal_observed_at_prioritization(db_session: Session):
    """Verifies that observed_at is prioritized over published_at for temporal matching (Section 8 & 16.2)."""
    now = datetime.now(timezone.utc)
    # Event observed 2 hours ago, but published just now
    ev_with_observed = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Timely Reporter",
            source_url=f"https://news.example.com/time-{uuid.uuid4().hex[:6]}",
            published_at=now,
            observed_at=now - timedelta(hours=2),
            title_or_summary="น้ำมีกลิ่นฉุน",
            event_type=EventTypeEnum.ODOR_REPORT,
            evidence_type=EvidenceTypeEnum.NEWS_ARTICLE,
            latitude=14.0509,
            longitude=101.3731,
            location_precision=LocationPrecisionEnum.EXACT,
            district="เมืองปราจีนบุรี"
        ),
        staff=StaffPrincipal("op1", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )
    
    corr1 = ExternalEvidenceService.correlate_evidence(db_session, ev_with_observed.id)
    temp1 = corr1["temporal_correlation"]
    assert temp1["time_basis"] == "OBSERVED_AT"
    assert temp1["age_hours"] >= 1.9
    assert temp1["is_fallback"] is False

    # Event missing observed_at uses published_at with explicit limitation disclosure
    ev_no_observed = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Late Reporter",
            source_url=f"https://news.example.com/time2-{uuid.uuid4().hex[:6]}",
            published_at=now - timedelta(hours=5),
            title_or_summary="พบปลาลอยผิวน้ำ",
            event_type=EventTypeEnum.FISH_KILL,
            evidence_type=EvidenceTypeEnum.NEWS_ARTICLE,
            latitude=14.0509,
            longitude=101.3731,
            location_precision=LocationPrecisionEnum.EXACT,
            district="เมืองปราจีนบุรี"
        ),
        staff=StaffPrincipal("op1", "operator_01", "Operator", StaffRole.OPERATOR, "Triage", "op@test.com")
    )

    corr2 = ExternalEvidenceService.correlate_evidence(db_session, ev_no_observed.id)
    temp2 = corr2["temporal_correlation"]
    assert "PUBLICATION_TIME" in temp2["time_basis"]
    assert temp2["is_fallback"] is True
    assert "limitation_note" in temp2


def test_ssrf_rejects_cloud_metadata_and_private_ips():
    """Validates SSRF prevention against AWS/GCP metadata and RFC1918 subnets (Section 3.6 & 29)."""
    malicious_urls = [
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.5/admin",
        "http://192.168.1.1:8080/secret",
        "http://172.16.0.10/internal",
        "http://localhost:5432",
    ]
    for url in malicious_urls:
        resp = client.post("/api/internal/external-evidence", json={
            "source_platform": "ONLINE_NEWS",
            "source_name": "Attacker",
            "source_url": url,
            "title_or_summary": "SSRF test",
            "event_type": "FLOODING",
            "evidence_type": "NEWS_ARTICLE"
        }, headers=OPERATOR_HEADERS)
        assert resp.status_code == 422, f"Expected 422 for blocked URL: {url}"


def test_versioned_migrations_discovery_and_applied():
    """Validates that versioned migrations 001, 002, 003 exist and are discoverable."""
    from migrations.migration_manager import MigrationManager
    from apps.api.app.core.database import engine

    migrations = MigrationManager.discover_migrations()
    versions = [m["version"] for m in migrations]
    assert "001" in versions
    assert "002" in versions
    assert "003" in versions

    applied = MigrationManager.apply_migrations(engine)
    assert isinstance(applied, list)


def test_public_evidence_events_diagram_alias(db_session: Session):
    """Verifies diagram routes GET /api/public/evidence-events return active events."""
    resp = client.get("/api/public/evidence-events")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_contradicting_evidence_reduces_priority_and_triggers_review(db_session: Session):
    """Verifies that CONTRADICTING_EVIDENCE actively reduces priority and triggers verification (Item 7)."""
    # 1. Create a Monitoring Event
    evt_resp = client.post("/api/internal/monitoring-events", json={
        "title": "Kabin River Observation",
        "event_type": "ABNORMAL_WATER_COLOR",
        "district": "กบินทร์บุรี"
    }, headers=OPERATOR_HEADERS)
    assert evt_resp.status_code == 201
    event_id = evt_resp.json()["event_id"]

    # 2. Create primary evidence
    ev1 = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Local News",
            source_url=f"https://news.example.com/obs-{uuid.uuid4().hex[:6]}",
            title_or_summary="Observed discolored water",
            event_type=EventTypeEnum.ABNORMAL_WATER_COLOR,
            evidence_type=EvidenceTypeEnum.PHOTO,
            district="กบินทร์บุรี",
            location_precision=LocationPrecisionEnum.DISTRICT
        ),
        staff=OPERATOR_STAFF
    )

    # Link primary evidence
    client.post(f"/api/internal/external-evidence/{ev1.id}/link-event", json={
        "event_id": event_id,
        "link_type": "PRIMARY_OBSERVATION",
        "relation_type": "PRIMARY_EVIDENCE",
        "relevance_score": 1.0
    }, headers=OPERATOR_HEADERS)

    evt_after_primary = db_session.query(MonitoringEvent).filter(MonitoringEvent.id == event_id).first()
    assert evt_after_primary.monitoring_priority in ["MODERATE", "HIGH"]

    # 3. Create contradicting evidence (e.g. follow-up inspection finding normal water)
    ev_contra = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.OFFICIAL_PUBLIC,
            source_name="Official Inspection",
            source_url=f"https://gov.example.com/inspect-{uuid.uuid4().hex[:6]}",
            title_or_summary="Water tested normal on inspection",
            event_type=EventTypeEnum.UNUSUAL_WATER_CONDITION,
            evidence_type=EvidenceTypeEnum.OFFICIAL_POST,
            district="กบินทร์บุรี",
            location_precision=LocationPrecisionEnum.DISTRICT
        ),
        staff=OPERATOR_STAFF
    )

    # Link as CONTRADICTING_EVIDENCE
    link_resp = client.post(f"/api/internal/external-evidence/{ev_contra.id}/link-event", json={
        "event_id": event_id,
        "link_type": "CORROBORATING_SIGNAL",
        "relation_type": "CONTRADICTING_EVIDENCE",
        "relevance_score": 1.0
    }, headers=OPERATOR_HEADERS)
    assert link_resp.status_code == 200

    db_session.expire_all()
    evt_after_contra = db_session.query(MonitoringEvent).filter(MonitoringEvent.id == event_id).first()
    # Priority should be downgraded and status changed to UNDER_VERIFICATION
    assert evt_after_contra.monitoring_priority in ["MODERATE", "LOW"]
    assert evt_after_contra.status == "UNDER_VERIFICATION"
    assert any("Contradicting Evidence" in factor for factor in evt_after_contra.priority_factors)


def test_repost_deduplication_prevents_independent_source_inflation(db_session: Session):
    """Verifies that reposts sharing source_group_id or parent do NOT inflate independent counts (Item 6 & 16)."""
    group_id = f"GRP-{uuid.uuid4().hex[:6].upper()}"

    # Create original
    ev_orig = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Original News",
            source_url=f"https://news.example.com/orig-{uuid.uuid4().hex[:6]}",
            title_or_summary="Canal foam noticed",
            event_type=EventTypeEnum.FOAM,
            evidence_type=EvidenceTypeEnum.NEWS_ARTICLE,
            source_group_id=group_id
        ),
        staff=OPERATOR_STAFF
    )

    # Create 2 mirrors/reposts
    ev_repost1 = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Community Share",
            source_url=f"https://facebook.com/share1-{uuid.uuid4().hex[:6]}",
            title_or_summary="Shared: Canal foam noticed",
            event_type=EventTypeEnum.FOAM,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            parent_evidence_id=ev_orig.id,
            source_group_id=group_id
        ),
        staff=OPERATOR_STAFF
    )

    ev_repost2 = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.X_TWITTER,
            source_name="Twitter Mirror",
            source_url=f"https://x.com/mirror-{uuid.uuid4().hex[:6]}",
            title_or_summary="Tweet: Canal foam noticed",
            event_type=EventTypeEnum.FOAM,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            parent_evidence_id=ev_orig.id,
            source_group_id=group_id
        ),
        staff=OPERATOR_STAFF
    )

    # Create event and link all 3
    evt = MonitoringEvent(
        id=f"MEV-{uuid.uuid4().hex[:6].upper()}",
        title="Foam Event",
        event_type="FOAM",
        created_by="test_op",
        provenance={"source": "test"}
    )
    db_session.add(evt)
    db_session.commit()

    for item in [ev_orig, ev_repost1, ev_repost2]:
        ExternalEvidenceService.link_to_monitoring_event(
            db=db_session,
            evidence_id=item.id,
            link_data=LinkMonitoringEventRequest(
                event_id=evt.id,
                relation_type=RelationTypeEnum.SUPPORTING_EVIDENCE
            ),
            staff=OPERATOR_STAFF
        )

    packet = ExternalEvidenceService.get_evidence_packet_for_event(db=db_session, event_id=evt.id)
    # Total records is 3, but independent_count must be strictly 1!
    assert packet["external_evidence"]["total_records"] == 3
    assert packet["external_evidence"]["independent_count"] == 1


def test_comprehensive_ssrf_rejects_ipv6_alternate_formats_and_credentials():
    """Verifies that IPv6, alternate decimal representations, and userinfo are rejected (Item 12)."""
    blocked_urls = [
        "http://[::1]/secret",
        "http://[fe80::1]/link-local",
        "http://[::ffff:127.0.0.1]/mapped",
        "http://2130706433/decimal-ip",
        "http://admin:secret@news.example.com/",
        "ftp://news.example.com/file",
        "gopher://127.0.0.1/",
    ]
    for url in blocked_urls:
        resp = client.post("/api/internal/external-evidence", json={
            "source_platform": "ONLINE_NEWS",
            "source_name": "SSRF Test",
            "source_url": url,
            "title_or_summary": "Test",
            "event_type": "FLOODING",
            "evidence_type": "PHOTO"
        }, headers=OPERATOR_HEADERS)
        assert resp.status_code == 422, f"Expected 422 for blocked URL {url}"


def test_public_api_filtering_strictly_hides_internal_and_withheld(db_session: Session):
    """Verifies that INTERNAL_ONLY and WITHHELD items never leak through public API (Item 13)."""
    # Create internal only
    ev_int = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Internal News",
            source_url=f"https://news.example.com/int-{uuid.uuid4().hex[:6]}",
            title_or_summary="Internal restricted evidence",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.PHOTO
        ),
        staff=OPERATOR_STAFF
    )
    ev_int.publication_status = "INTERNAL_ONLY"

    # Create withheld
    ev_withheld = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Withheld News",
            source_url=f"https://news.example.com/withheld-{uuid.uuid4().hex[:6]}",
            title_or_summary="Withheld unreviewed evidence",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.PHOTO
        ),
        staff=OPERATOR_STAFF
    )
    ev_withheld.publication_status = "WITHHELD"

    # Create public safe
    ev_pub = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.ONLINE_NEWS,
            source_name="Public News",
            source_url=f"https://news.example.com/pub-{uuid.uuid4().hex[:6]}",
            title_or_summary="Public safe evidence",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.PHOTO
        ),
        staff=OPERATOR_STAFF
    )
    ev_pub.publication_status = "PUBLIC_SAFE"
    db_session.commit()

    # Query public endpoint
    pub_resp = client.get("/api/public/external-evidence")
    assert pub_resp.status_code == 200
    returned_ids = [item["id"] for item in pub_resp.json()]

    assert ev_pub.id in returned_ids
    assert ev_int.id not in returned_ids
    assert ev_withheld.id not in returned_ids

    # Query single detail for internal item should be 404
    detail_resp = client.get(f"/api/public/external-evidence/{ev_int.id}")
    assert detail_resp.status_code == 404


# ==============================================================================
# 9. Deduplication, Grouping, and News Separation Regression Tests (Objective)
# ==============================================================================

def test_url_normalization_and_platform_post_id():
    """Verifies that tracking parameters are stripped safely while preserving canonical post identity."""
    raw_fb_1 = "https://m.facebook.com/story.php?story_fbid=pfbid02VDNzGccBpzvyVizbe9ukjfvyJNgBh3uPfY6nCBPMzLL22kKE8oCFBbeEXW3G3Vfkl&id=100004345474133&fbclid=IwAR123abc&utm_source=share"
    raw_fb_2 = "https://www.facebook.com/story.php?id=100004345474133&story_fbid=pfbid02VDNzGccBpzvyVizbe9ukjfvyJNgBh3uPfY6nCBPMzLL22kKE8oCFBbeEXW3G3Vfkl"

    norm_1 = normalize_source_url(raw_fb_1)
    norm_2 = normalize_source_url(raw_fb_2)
    assert norm_1 == norm_2, f"Expected identical normalized URLs, got {norm_1} vs {norm_2}"
    assert "fbclid" not in norm_1
    assert "utm_source" not in norm_1

    # Extract platform post IDs
    pid_1 = extract_platform_post_id(raw_fb_1)
    pid_2 = extract_platform_post_id(raw_fb_2)
    assert pid_1 == "fb:story_fbid:pfbid02VDNzGccBpzvyVizbe9ukjfvyJNgBh3uPfY6nCBPMzLL22kKE8oCFBbeEXW3G3Vfkl"
    assert pid_1 == pid_2


def test_duplicate_detection_exact_and_canonical_url(db_session: Session):
    """Verifies importing the same URL or canonical URL twice marks the second record as is_duplicate=True."""
    u = f"https://www.facebook.com/watch/?v=999888{uuid.uuid4().hex[:4]}"
    
    first_ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Citizen A",
            source_url=u,
            title_or_summary="น้ำท่วมบริเวณตลาดกบินทร์บุรี",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST
        ),
        staff=OPERATOR_STAFF
    )
    assert first_ev.is_duplicate is False

    # Second import with tracking param
    second_url = f"{u}&fbclid=IwAR999_test_tracker"
    second_ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Citizen A",
            source_url=second_url,
            title_or_summary="น้ำท่วมบริเวณตลาดกบินทร์บุรี (โพสต์ซ้ำ)",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST
        ),
        staff=OPERATOR_STAFF
    )

    assert second_ev.is_duplicate is True
    assert second_ev.parent_evidence_id == first_ev.id
    assert "IDENTICAL_CANONICAL_URL" in (second_ev.duplicate_reason or "")


def test_duplicate_detection_platform_post_id(db_session: Session):
    """Verifies different URLs pointing to the same underlying post are detected as duplicates."""
    fbid = f"pfbid_test_{uuid.uuid4().hex[:6]}"
    mobile_url = f"https://m.facebook.com/story.php?story_fbid={fbid}&id=1000123"
    web_url = f"https://web.facebook.com/story.php?id=1000123&story_fbid={fbid}&ref=bookmarks"

    first_ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Citizen Post",
            source_url=mobile_url,
            title_or_summary="รายงานระดับน้ำคลองพญาปราบ",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST
        ),
        staff=OPERATOR_STAFF
    )
    assert first_ev.is_duplicate is False

    second_ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Citizen Post Web",
            source_url=web_url,
            title_or_summary="รายงานระดับน้ำคลองพญาปราบ (แชร์)",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST
        ),
        staff=OPERATOR_STAFF
    )

    assert second_ev.is_duplicate is True
    assert second_ev.parent_evidence_id == first_ev.id
    assert any(term in (second_ev.duplicate_reason or "") for term in ["IDENTICAL_CANONICAL_URL", "MATCHING_PLATFORM_POST_ID"])


def test_duplicate_detection_reused_media(db_session: Session):
    """Verifies identical media URL across records is detected as a duplicate."""
    media_url = f"https://cdn.example.com/unique_evidence_{uuid.uuid4().hex[:8]}.jpg"

    first_ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Original Post",
            source_url=f"https://fb.example.com/p1_{uuid.uuid4().hex[:4]}",
            title_or_summary="ภาพคราบน้ำมันคลองชะอม",
            event_type=EventTypeEnum.WATER_APPEARANCE,
            evidence_type=EvidenceTypeEnum.PHOTO,
            media_references=[{
                "media_type": "PHOTO",
                "source_media_url": media_url,
                "license_or_permission_status": "FAIR_USE_THUMBNAIL"
            }]
        ),
        staff=OPERATOR_STAFF
    )
    assert first_ev.is_duplicate is False

    # Second record with different URL but same media
    second_ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="Reposted Post",
            source_url=f"https://fb.example.com/p2_{uuid.uuid4().hex[:4]}",
            title_or_summary="ภาพคราบน้ำมันที่มีการรีโพสต์",
            event_type=EventTypeEnum.WATER_APPEARANCE,
            evidence_type=EvidenceTypeEnum.PHOTO,
            media_references=[{
                "media_type": "PHOTO",
                "source_media_url": media_url,
                "license_or_permission_status": "FAIR_USE_THUMBNAIL"
            }]
        ),
        staff=OPERATOR_STAFF
    )

    assert second_ev.is_duplicate is True
    assert second_ev.parent_evidence_id == first_ev.id
    assert "IDENTICAL_MEDIA" in (second_ev.duplicate_reason or "")


def test_same_incident_different_sources_grouped_not_duplicated(db_session: Session):
    """Verifies different sources reporting the same event retain distinct records under one group."""
    grp_id = f"GRP-TEST-{uuid.uuid4().hex[:6]}"

    # Source 1: Local resident
    ev1 = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="ชาวบ้าน ม.3 หัวหว้า",
            source_url=f"https://facebook.com/post_{uuid.uuid4().hex[:6]}",
            title_or_summary="ชาวบ้านพบกลิ่นสารเคมีและน้ำเปลี่ยนสี คลองหัวหว้า",
            event_type=EventTypeEnum.WATER_APPEARANCE,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            district="ศรีมหาโพธิ"
        ),
        staff=OPERATOR_STAFF
    )
    ev1.source_group_id = grp_id
    ev1.publication_status = "PUBLIC_SAFE"

    # Source 2: Community leader (distinct post, distinct person)
    ev2 = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="ผู้ใหญ่บ้าน ม.3 หัวหว้า",
            source_url=f"https://facebook.com/post_{uuid.uuid4().hex[:6]}",
            title_or_summary="ผู้ใหญ่บ้านลงพื้นที่ตรวจสอบลำรางสาธารณะร่วมกับ อบต.",
            event_type=EventTypeEnum.WATER_APPEARANCE,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            district="ศรีมหาโพธิ"
        ),
        staff=OPERATOR_STAFF
    )
    ev2.source_group_id = grp_id
    ev2.publication_status = "PUBLIC_SAFE"

    db_session.commit()

    # Both must NOT be marked duplicate!
    assert ev1.is_duplicate is False
    assert ev2.is_duplicate is False

    # But public grouped query should group them
    pub_resp = client.get("/api/public/external-evidence?group_by_event=true")
    assert pub_resp.status_code == 200
    items = pub_resp.json()

    # Find the primary card for this group
    grouped_items = [i for i in items if i.get("source_group_id") == grp_id]
    assert len(grouped_items) == 1, "Expected exactly 1 canonical card for this group"
    primary = grouped_items[0]
    assert primary["related_sources_count"] == 2
    assert len(primary["related_sources"]) == 1
    related_ids = [s["id"] for s in primary["related_sources"]]
    assert (ev1.id in related_ids) or (ev2.id in related_ids)


def test_similar_titles_different_incidents_never_merged(db_session: Session):
    """Verifies similar titles describing different incidents in different areas/times are never merged."""
    ev_kabin = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="ข่าวชุมชนกบินทร์",
            source_url=f"https://fb.example.com/kabin_{uuid.uuid4().hex[:6]}",
            title_or_summary="น้ำท่วมถนนและพื้นที่การเกษตร ระดับน้ำสูง 30 ซม.",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            district="กบินทร์บุรี"
        ),
        staff=OPERATOR_STAFF
    )

    ev_bansang = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="ข่าวชุมชนบ้านสร้าง",
            source_url=f"https://fb.example.com/bansang_{uuid.uuid4().hex[:6]}",
            title_or_summary="น้ำท่วมถนนและพื้นที่การเกษตร ระดับน้ำสูง 30 ซม.",  # Exact same title!
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            district="บ้านสร้าง"  # Different district!
        ),
        staff=OPERATOR_STAFF
    )

    # Must NOT be marked duplicate despite exact same title text
    assert ev_kabin.is_duplicate is False
    assert ev_bansang.is_duplicate is False
    assert ev_kabin.source_group_id != ev_bansang.source_group_id


def test_related_news_linked_to_monitoring_event_never_becomes_citizen_report(db_session: Session):
    """Verifies news articles provide supporting context via related_news without becoming citizen reports."""
    mev_id = f"MEV-TEST-{uuid.uuid4().hex[:6]}"
    ev_id = f"EVD-TEST-{uuid.uuid4().hex[:6]}"
    news_id = f"INF-TEST-{uuid.uuid4().hex[:6]}"

    # Create monitoring event
    mev = MonitoringEvent(
        id=mev_id,
        title="การเฝ้าระวังคุณภาพน้ำคลองหัวหว้า",
        event_type="WATER_POLLUTION",
        monitoring_priority="HIGH",
        district="ศรีมหาโพธิ",
        status="ACTIVE",
        created_by="operator_01",
        provenance={"source": "test"}
    )
    db_session.add(mev)

    # Create citizen evidence linked to mev
    ev = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="รายงานชุมชนหัวหว้า",
            source_url=f"https://fb.example.com/{uuid.uuid4().hex[:6]}",
            title_or_summary="พบคราบฟองและกลิ่นสารเคมีในคลองหัวหว้า",
            event_type=EventTypeEnum.WATER_APPEARANCE,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            district="ศรีมหาโพธิ"
        ),
        staff=OPERATOR_STAFF
    )
    ev.monitoring_event_id = mev_id
    ev.publication_status = "PUBLIC_SAFE"

    # Create news article in ExternalInformation linked to same mev
    news = ExternalInformation(
        id=news_id,
        source_id="src_thaipbs",
        source_platform="ONLINE_NEWS",
        content_hash=f"hash_{uuid.uuid4().hex}",
        source_name="สำนักข่าวไทยพีบีเอส",
        source_type="NEWS_MEDIA",
        authority_level="SECONDARY",
        source_url=f"https://thaipbs.example.com/news-{uuid.uuid4().hex[:6]}",
        title="กรมควบคุมมลพิษเข้าตรวจบ่อฝังกลบกากอุตสาหกรรมศรีมหาโพธิ",
        summary="เจ้าหน้าที่สิ่งแวดล้อมภาค 7 ลงพื้นที่เก็บตัวอย่างน้ำเพื่อตรวจสอบค่าโลหะหนัก",
        monitoring_event_id=mev_id,
        verification_status="CURATED",
        provenance={"source": "test"}
    )
    db_session.add(news)
    db_session.commit()

    # Query public evidence with group_by_event
    resp = client.get("/api/public/external-evidence?group_by_event=true")
    assert resp.status_code == 200
    matched = next((item for item in resp.json() if item["id"] == ev.id), None)
    assert matched is not None
    assert matched["related_news"] is not None
    assert len(matched["related_news"]) >= 1
    news_titles = [n["title"] for n in matched["related_news"]]
    assert "กรมควบคุมมลพิษเข้าตรวจบ่อฝังกลบกากอุตสาหกรรมศรีมหาโพธิ" in news_titles

    # Verify news article is NOT in CitizenReport table
    citizen_reports = db_session.query(CitizenReport).filter(CitizenReport.id == news_id).first()
    assert citizen_reports is None, "News article must NEVER be converted to CitizenReport"

    # Verify news article remains in ExternalInformation
    assert db_session.query(ExternalInformation).filter(ExternalInformation.id == news_id).first() is not None


def test_empty_results_and_missing_media_graceful_handling(db_session: Session):
    """Verifies that items without media references or query with no matches return cleanly."""
    ev_no_media = ExternalEvidenceService.create_evidence(
        db=db_session,
        data=ExternalEvidenceCreate(
            source_platform=SourcePlatformEnum.FACEBOOK,
            source_name="No Media Source",
            source_url=f"https://fb.example.com/nomedia_{uuid.uuid4().hex[:6]}",
            title_or_summary="รายงานสถานการณ์น้ำแห้งปกติ",
            event_type=EventTypeEnum.FLOODING,
            evidence_type=EvidenceTypeEnum.SOCIAL_POST,
            district="ประจันตคาม"
        ),
        staff=OPERATOR_STAFF
    )
    ev_no_media.publication_status = "PUBLIC_SAFE"
    db_session.commit()

    resp = client.get(f"/api/public/external-evidence?district=ประจันตคาม")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    found = next(i for i in items if i["id"] == ev_no_media.id)
    assert found["media_references"] == []
    assert found["is_duplicate"] is False


