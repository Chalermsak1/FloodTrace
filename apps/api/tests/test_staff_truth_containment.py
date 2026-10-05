import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.main import app
from apps.api.app.models.entities import CitizenReport, CitizenReportAuditLog, CitizenReportVerification

client = TestClient(app)
HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY}


@pytest.fixture
def report():
    db = SessionLocal()
    item = CitizenReport(
        id=f"truth_{uuid.uuid4().hex[:10]}", reporter_name="TEST/DEMO", reporter_role="TEST/DEMO",
        district="เมืองปราจีนบุรี", subdistrict="หน้าเมือง", latitude=14.05, longitude=101.38,
        public_latitude=14.05, public_longitude=101.38, category="ข้อสังเกตทั่วไป", status="NEW",
        verification_status="UNVERIFIED", review_status="PENDING_REVIEW", publication_state="PRIVATE",
        exact_latitude=14.05, exact_longitude=101.38,
        created_at=datetime.now(timezone.utc), provenance={},
    )
    db.add(item)
    db.commit()
    yield item
    db.query(CitizenReportVerification).filter_by(report_id=item.id).delete()
    db.query(CitizenReportAuditLog).filter_by(report_id=item.id).delete()
    db.query(CitizenReport).filter_by(id=item.id).delete()
    db.commit()
    db.close()


def payload(status="UNVERIFIED", **overrides):
    result = {
        "verification_status": status,
        "verification_method": "OTHER",
        "what_was_reported": "   ",
        "what_was_observed": None,
        "what_system_data_shows": " ",
        "what_model_suggests": None,
        "what_is_unknown": " \t ",
        "what_should_be_verified": None,
    }
    result.update(overrides)
    return result


def test_missing_assessment_values_remain_null(report):
    response = client.post(f"/api/v1/admin/reports/{report.id}/verify", headers=HEADERS, json=payload())
    assert response.status_code == 200
    db = SessionLocal()
    record = db.query(CitizenReportVerification).filter_by(report_id=report.id).one()
    assert record.structured_assessment == {
        "what_was_reported": None, "what_was_observed": None, "what_system_data_shows": None,
        "what_model_suggests": None, "what_is_unknown": None, "what_should_be_verified": None,
    }
    assert record.verification_status == "UNVERIFIED"
    assert record.verified_by == "admin_user"
    audit = db.query(CitizenReportAuditLog).filter_by(report_id=report.id, action="VERIFICATION_UPDATED").one()
    assert audit.actor_id == "admin_user"
    assert audit.actor_role == "ADMIN"
    db.close()


@pytest.mark.parametrize("status", ["VERIFIED_OBSERVATION", "OFFICIAL_CONFIRMED"])
def test_stronger_status_requires_observed_evidence(report, status):
    response = client.post(f"/api/v1/admin/reports/{report.id}/verify", headers=HEADERS, json=payload(status))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_verified_observation_requires_valid_method(report):
    response = client.post(f"/api/v1/admin/reports/{report.id}/verify", headers=HEADERS, json=payload(
        "VERIFIED_OBSERVATION", verification_method="OTHER", what_was_observed="Observed condition"
    ))
    assert response.status_code == 400


def test_verified_observation_cannot_use_official_source_method(report):
    response = client.post(f"/api/v1/admin/reports/{report.id}/verify", headers=HEADERS, json=payload(
        "VERIFIED_OBSERVATION", verification_method="OFFICIAL_SOURCE", what_was_observed="Observed condition"
    ))
    assert response.status_code == 400


def test_partial_status_only_moves_report_to_under_verification(report):
    response = client.post(f"/api/v1/admin/reports/{report.id}/verify", headers=HEADERS, json=payload(
        "PARTIALLY_VERIFIED", verification_method="OTHER"
    ))
    assert response.status_code == 200
    assert response.json()["verification_status"] == "PARTIALLY_VERIFIED"
    assert response.json()["status"] == "UNDER_VERIFICATION"


def test_official_confirmation_requires_citation_and_method(report):
    response = client.post(f"/api/v1/admin/reports/{report.id}/verify", headers=HEADERS, json=payload(
        "OFFICIAL_CONFIRMED", verification_method="OFFICIAL_SOURCE", what_was_observed="Observed record", official_source_evidence="citation-001"
    ))
    assert response.status_code == 200


def test_public_verified_rejects_legacy_or_missing_verification(report):
    response = client.post(f"/api/v1/admin/reports/{report.id}/publication", headers=HEADERS, json={
        "publication_state": "PUBLIC_VERIFIED", "reason": "Test eligibility gate"
    })
    assert response.status_code == 400


def test_legacy_invalid_verification_is_labeled_unvalidated(report):
    db = SessionLocal()
    report.verification_status = "VERIFIED_OBSERVATION"
    db.merge(report)
    db.add(CitizenReportVerification(
        id=f"legacy_{uuid.uuid4().hex[:10]}", report_id=report.id,
        verification_status="VERIFIED_OBSERVATION", verification_method="OTHER",
        verified_by="legacy", verified_at=datetime.now(timezone.utc),
        structured_assessment={"what_was_observed": " "},
    ))
    db.commit()
    db.close()
    response = client.get(f"/api/v1/admin/reports/{report.id}", headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["verification"]["status"] == "LEGACY_UNVALIDATED"


def test_crosscheck_waterways_are_empty_and_unavailable(report):
    response = client.get(f"/api/v1/admin/reports/{report.id}/context", headers=HEADERS)
    assert response.status_code == 200
    context = response.json()
    assert context["correlated_waterways"] == []
    assert context["waterway_status"] == "UNAVAILABLE / UNVERIFIED"
    assert context["waterway_reason"] == "LOCAL_ARTIFACT_ABSENT"
