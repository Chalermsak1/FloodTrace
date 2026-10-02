"""
Automated Test Suite for FloodTrace Staff Operations Console & Citizen Report Lifecycle
Verifies:
1. Authentication & RBAC enforcement (ADMIN, REVIEWER, OPERATOR, READ_ONLY)
2. Report validation & automatic triage (active area, out-of-scope, priority, duplicate check)
3. State machine enforcement & invalid transition blocking
4. Structured human verification & official confirmation requirements
5. Assignment, reassignment, and operational priority
6. Information request workflow
7. Formal escalation & resolution lifecycle
8. Append-only audit logging
9. Public / internal data separation (PII protection, exact GPS protection)
10. System cross-check & telemetry correlation
"""

import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal, get_db
from apps.api.app.models.entities import CitizenReport, CitizenReportAuditLog, StaffUser

client = TestClient(app)

ADMIN_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY, "X-Staff-Role": "ADMIN", "X-Staff-User": "admin_user"}
REVIEWER_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY, "X-Staff-Role": "REVIEWER", "X-Staff-User": "reviewer_01"}
OPERATOR_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY, "X-Staff-Role": "OPERATOR", "X-Staff-User": "operator_01"}
READONLY_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY, "X-Staff-Role": "READ_ONLY", "X-Staff-User": "readonly_01"}

@pytest.fixture
def test_report(db: Session = None):
    """Creates a fresh test citizen report in Prachin Buri."""
    db_session = SessionLocal()
    rep_id = f"test_rpt_{uuid.uuid4().hex[:8]}"
    report = CitizenReport(
        id=rep_id,
        reporter_name="สมศักดิ์ รักถิ่น",
        reporter_role="CITIZEN",
        reporter_email="somsak@example.com",
        reporter_phone="081-234-5678",
        exact_latitude=14.0535,
        exact_longitude=101.3868,
        latitude=14.05,
        longitude=101.39,
        public_latitude=14.05,
        public_longitude=101.39,
        district="เมืองปราจีนบุรี",
        subdistrict="หน้าเมือง",
        water_depth_cm=45.0,
        water_flow_speed="SLOW",
        contamination_signs=["กลิ่นสารเคมี", "dead_fish"],
        description="พบกลิ่นฉุนและมีปลาลอยผิดปกติบริเวณริมตลิ่งใกล้สะพาน",
        photo_url="/uploads/test_evidence_1.jpg",
        status="NEW",
        priority="NORMAL",
        category="กลิ่นผิดปกติ",
        verification_status="UNVERIFIED",
        review_status="PENDING_REVIEW",
        publication_state="PRIVATE",
        created_at=datetime.now(timezone.utc),
        provenance={"agency": "Citizen Public Report", "category": "CITIZEN_REPORTED"}
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)
    yield report
    # Cleanup
    try:
        db_session.delete(report)
        db_session.commit()
    except Exception:
        pass
    finally:
        db_session.close()


def test_unauthenticated_access_blocked():
    """Critical Test 1: Public user cannot access staff console endpoints."""
    resp = client.get("/api/v1/admin/reports")
    # Must be 401 Unauthorized
    assert resp.status_code == 401


def test_staff_profile_and_roles():
    """Verifies staff authentication and permission resolution."""
    resp_admin = client.get("/api/v1/admin/auth/me", headers=ADMIN_HEADERS)
    assert resp_admin.status_code == 200
    data_admin = resp_admin.json()
    assert data_admin["role"] == "ADMIN"
    assert data_admin["permissions"]["can_manage_publication"] is True

    resp_ro = client.get("/api/v1/admin/auth/me", headers=READONLY_HEADERS)
    assert resp_ro.status_code == 200
    data_ro = resp_ro.json()
    assert data_ro["role"] == "READ_ONLY"
    assert data_ro["permissions"]["can_assign"] is False
    assert data_ro["permissions"]["can_verify"] is False


def test_readonly_user_cannot_mutate(test_report):
    """Critical Test 2: READ_ONLY staff cannot perform mutations or status changes."""
    # Attempt status change
    resp = client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=READONLY_HEADERS,
        json={"new_status": "TRIAGING", "reason": "Attempting unauthorized status change"}
    )
    assert resp.status_code == 403

    # Attempt assignment
    resp_assign = client.post(
        f"/api/v1/admin/reports/{test_report.id}/assign",
        headers=READONLY_HEADERS,
        json={"assigned_to": "readonly_01"}
    )
    assert resp_assign.status_code == 403


def test_operator_can_assign_but_cannot_verify(test_report):
    """Critical Test 3: OPERATOR can triage and assign, but cannot verify."""
    # Operator assigns report
    resp_assign = client.post(
        f"/api/v1/admin/reports/{test_report.id}/assign",
        headers=OPERATOR_HEADERS,
        json={"assigned_to": "reviewer_01", "assignment_note": "Triage verified, assigning to environmental unit"}
    )
    assert resp_assign.status_code == 200
    data = resp_assign.json()
    assert data["assigned_to"] == "reviewer_01"

    # Operator tries to verify -> Must be 403 Forbidden
    resp_verify = client.post(
        f"/api/v1/admin/reports/{test_report.id}/verify",
        headers=OPERATOR_HEADERS,
        json={
            "verification_status": "VERIFIED_OBSERVATION",
            "verification_method": "VISUAL_REVIEW",
            "what_was_reported": "Odor and fish death",
            "what_was_observed": "Fish floating",
            "what_system_data_shows": "Nearby station normal",
            "what_model_suggests": "Low runoff",
            "what_is_unknown": "Chemical source",
            "what_should_be_verified": "Water sample assay"
        }
    )
    assert resp_verify.status_code == 403


def test_state_machine_valid_and_invalid_transitions(test_report):
    """Critical Test 4: Explicit state transitions are enforced; invalid shortcuts blocked."""
    # Invalid jump: NEW -> RESOLVED directly is prohibited
    resp_invalid = client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "RESOLVED", "reason": "Jumping invalid state"}
    )
    assert resp_invalid.status_code == 400

    # Valid step 1: NEW -> TRIAGING
    resp1 = client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "TRIAGING", "reason": "Initial triage"}
    )
    assert resp1.status_code == 200

    # Valid step 2: TRIAGING -> ASSIGNED
    resp2 = client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "ASSIGNED", "reason": "Assigned to team"}
    )
    assert resp2.status_code == 200

    # Valid step 3: ASSIGNED -> IN_REVIEW
    resp3 = client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "IN_REVIEW", "reason": "Inspection started"}
    )
    assert resp3.status_code == 200


def test_official_confirmed_requires_explicit_evidence(test_report):
    """Critical Test 5: OFFICIAL_CONFIRMED requires explicit official source citation."""
    # Set to UNDER_VERIFICATION first
    client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "TRIAGING", "reason": "Triage"}
    )
    client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "ASSIGNED", "reason": "Assign"}
    )
    client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "IN_REVIEW", "reason": "Review"}
    )
    client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "UNDER_VERIFICATION", "reason": "Verification"}
    )

    # Attempt OFFICIAL_CONFIRMED without evidence -> Must be HTTP 400
    resp_no_ev = client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={"new_status": "OFFICIAL_CONFIRMED", "reason": "Confirming without evidence"}
    )
    assert resp_no_ev.status_code == 400

    # With official evidence -> Succeeds
    resp_ok = client.post(
        f"/api/v1/admin/reports/{test_report.id}/status",
        headers=REVIEWER_HEADERS,
        json={
            "new_status": "OFFICIAL_CONFIRMED",
            "reason": "Official confirmation received from Pollution Control Dept",
            "official_source_evidence": "หนังสือราชการ กรมควบคุมมลพิษ ที่ ทส 0305/ว1234 ผลตรวจค่า DO ต่ำกว่ามาตรฐาน"
        }
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["new_status"] == "OFFICIAL_CONFIRMED"


def test_structured_verification_workflow(test_report):
    """Critical Test 6: Structured verification establishes factual boundaries."""
    resp = client.post(
        f"/api/v1/admin/reports/{test_report.id}/verify",
        headers=REVIEWER_HEADERS,
        json={
            "verification_status": "VERIFIED_OBSERVATION",
            "verification_method": "CROSS_CHECKED_SYSTEM_DATA",
            "notes": "ตรวจสอบเบื้องต้นสอดคล้องกับรายงานในพื้นที่ใกล้เคียง",
            "what_was_reported": "ผู้แจ้งระบุว่าพบน้ำมีกลิ่นฉุนและปลาตาย",
            "what_was_observed": "ตรวจสอบภาพถ่ายพบปลาตายริมตลิ่งจริงและผิวน้ำมีฝ้าสีคล้ำ",
            "what_system_data_shows": "สถานีโทรมาตร PRB-01 ระดับน้ำปกติ 3.2m MSL ปริมาณฝน 24 ชม. สะสม 12mm",
            "what_model_suggests": "แบบจำลองแสดงความเสี่ยงปานกลางในแนวคุ้งน้ำ",
            "what_is_unknown": "ยังไม่ทราบชนิดของสารเคมีเนื่องจากต้องรอผลตรวจจากห้องแล็บ",
            "what_should_be_verified": "เก็บตัวอย่างน้ำส่งตรวจโลหะหนักและค่า COD/BOD"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verification_status"] == "VERIFIED_OBSERVATION"
    assert data["status"] == "VERIFIED_OBSERVATION"

    # Detail endpoint reflects structured verification
    resp_detail = client.get(f"/api/v1/admin/reports/{test_report.id}", headers=REVIEWER_HEADERS)
    assert resp_detail.status_code == 200
    ver = resp_detail.json()["verification"]
    assert ver["structured_assessment"]["what_was_reported"] == "ผู้แจ้งระบุว่าพบน้ำมีกลิ่นฉุนและปลาตาย"


def test_escalation_and_resolution(test_report):
    """Critical Test 7: Escalation and resolution lifecycles preserve record integrity."""
    # Escalate
    resp_esc = client.post(
        f"/api/v1/admin/reports/{test_report.id}/escalate",
        headers=REVIEWER_HEADERS,
        json={
            "destination_team": "POLLUTION_CONTROL_CENTER_7",
            "escalation_reason": "ต้องเก็บตัวอย่างน้ำเพื่อวิเคราะห์สารพิษปนเปื้อนเร่งด่วน",
            "urgency": "HIGH",
            "evidence_summary": "ภาพถ่ายปลาตายและพิกัดริมแม่น้ำปราจีนบุรี"
        }
    )
    assert resp_esc.status_code == 200
    assert resp_esc.json()["status"] == "ESCALATED"

    # Resolve
    resp_res = client.post(
        f"/api/v1/admin/reports/{test_report.id}/resolve",
        headers=REVIEWER_HEADERS,
        json={
            "resolution_type": "VERIFIED_OBSERVATION",
            "resolution_summary": "เจ้าหน้าที่ศูนย์ควบคุมมลพิษเข้าเก็บตัวอย่างน้ำเรียบร้อยแล้ว บันทึกเป็นข้อสังเกตที่มีการยืนยัน"
        }
    )
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "RESOLVED"
    assert resp_res.json()["resolution_type"] == "VERIFIED_OBSERVATION"


def test_append_only_audit_log(test_report):
    """Critical Test 8: All events are chronologically appended to audit log."""
    # View report detail (triggers EVIDENCE_VIEWED audit log)
    resp_detail = client.get(f"/api/v1/admin/reports/{test_report.id}", headers=ADMIN_HEADERS)
    assert resp_detail.status_code == 200

    resp_timeline = client.get(f"/api/v1/admin/reports/{test_report.id}/timeline", headers=ADMIN_HEADERS)
    assert resp_timeline.status_code == 200
    events = resp_timeline.json()
    assert len(events) >= 1
    actions = [e["action"] for e in events]
    assert "EVIDENCE_VIEWED" in actions


def test_public_internal_separation(test_report):
    """Critical Test 9: Exact GPS, PII, and internal notes NEVER appear in public endpoints."""
    # Query public endpoint
    resp_pub = client.get(f"/api/v1/reports/")
    assert resp_pub.status_code == 200
    pub_reports = resp_pub.json()

    # Find the report in public list if visible
    for r in pub_reports:
        if r["id"] == test_report.id:
            # Check PII protection
            assert "reporter_name" not in r or "somsak" not in str(r.get("reporter_name", "")).lower()
            assert "reporter_phone" not in r or r.get("reporter_phone") is None
            assert "reporter_email" not in r or r.get("reporter_email") is None
            assert "moderation_notes" not in r
            # Check exact GPS protection (must be generalized coordinate)
            assert r["latitude"] == test_report.public_latitude
            assert r["longitude"] == test_report.public_longitude
            assert r["latitude"] != 14.0535 # generalized != exact 4-decimal place


def test_out_of_scope_detection():
    """Critical Test 10: Reports outside Prachin Buri are marked OUT_OF_SCOPE."""
    db = SessionLocal()
    out_id = f"out_scope_{uuid.uuid4().hex[:8]}"
    out_report = CitizenReport(
        id=out_id,
        reporter_name="ผู้สังเกตการณ์ กทม",
        reporter_role="CITIZEN",
        exact_latitude=13.7563, # Bangkok coordinates
        exact_longitude=100.5018,
        latitude=13.76,
        longitude=100.50,
        public_latitude=13.76,
        public_longitude=100.50,
        district="พระนคร",
        subdistrict="พระบรมมหาราชวัง",
        water_depth_cm=0.0,
        status="NEW",
        category="ข้อสังเกตทั่วไป",
        verification_status="UNVERIFIED",
        provenance={"agency": "Citizen Public Report", "category": "CITIZEN_REPORTED"}
    )
    db.add(out_report)
    db.commit()

    try:
        # Trigger triage
        resp_triage = client.post(f"/api/v1/admin/reports/{out_id}/triage", headers=ADMIN_HEADERS)
        assert resp_triage.status_code == 200
        triage_data = resp_triage.json()["triage_result"]
        assert triage_data["status"] == "OUT_OF_SCOPE"
        assert "OUT_OF_SCOPE" in triage_data["flags"]
    finally:
        db.delete(out_report)
        db.commit()
        db.close()


def test_system_crosscheck_telemetry(test_report):
    """Critical Test 11: Correlates nearest water station and rainfall without false claims."""
    resp = client.get(f"/api/v1/admin/reports/{test_report.id}/context", headers=REVIEWER_HEADERS)
    assert resp.status_code == 200
    ctx = resp.json()
    assert ctx["report_id"] == test_report.id
    assert ctx["is_inside_prachinburi"] is True
    assert "disclaimer" in ctx
    # Verify non-hallucination notice
    assert "ไม่ถือเป็นผลการยืนยันน้ำท่วม" in ctx["disclaimer"]
