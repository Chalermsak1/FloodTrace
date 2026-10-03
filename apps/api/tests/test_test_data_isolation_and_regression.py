"""
FloodTrace Test Data Isolation & Quarantine Regression Suite
Master Prompt Section 12: Proves that test/demo/audit records cannot leak into public metrics,
public maps, public overview, or citizen activity counters.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.models.entities import CitizenReport
from apps.api.app.core.database import SessionLocal

client = TestClient(app)

def setup_isolated_reports():
    """
    Populates isolated test reports representing test fixtures, whistleblower mocks,
    audit submissions, and genuine public observations.
    """
    with SessionLocal() as db:
        # Clear existing citizen reports in test database for this test
        db.query(CitizenReport).delete()
        reports = [
            # Quarantined automated test fixture
            CitizenReport(
                id="rep-test-fixture-01",
                reporter_name="Somchai Test Automated",
                reporter_role="TEST/DEMO",
                description="Automated idempotency fixture",
                district="กบินทร์บุรี",
                subdistrict="กบินทร์",
                latitude=13.99,
                longitude=101.76,
                exact_latitude=13.99,
                exact_longitude=101.76,
                public_latitude=13.99,
                public_longitude=101.76,
                verification_status="TEST_DEMO",
                publication_state="WITHHELD",
                provenance={"source_agency": "AutomatedTest", "category": "TEST_DATA"},
                created_at=datetime.now(timezone.utc)
            ),
            # Quarantined whistleblower mock
            CitizenReport(
                id="rep-whistleblower-mock-01",
                reporter_name="Classified Whistleblower 99",
                reporter_role="WHISTLEBLOWER",
                description="Mock synthetic wastewater runoff report",
                district="กบินทร์บุรี",
                subdistrict="กบินทร์",
                latitude=13.98,
                longitude=101.75,
                exact_latitude=13.98,
                exact_longitude=101.75,
                public_latitude=13.98,
                public_longitude=101.75,
                verification_status="FLAGGED",
                publication_state="WITHHELD",
                provenance={"source_agency": "WhistleblowerFixture", "category": "MOCK_DATA"},
                created_at=datetime.now(timezone.utc)
            ),
            # Quarantined pre-launch audit report
            CitizenReport(
                id="rep-audit-submission-01",
                reporter_name="System Auditor",
                reporter_role="CITIZEN",
                description="ตรวจสอบความพร้อมระบบก่อนเปิดใช้งานจริง",
                district="กบินทร์บุรี",
                subdistrict="กบินทร์",
                latitude=13.97,
                longitude=101.74,
                exact_latitude=13.97,
                exact_longitude=101.74,
                public_latitude=13.97,
                public_longitude=101.74,
                verification_status="NEW",
                publication_state="WITHHELD",
                provenance={"source_agency": "AuditScript", "category": "AUDIT_DATA"},
                created_at=datetime.now(timezone.utc)
            ),
            # Genuine public observation with generalized coordinates
            CitizenReport(
                id="rep-public-real-01",
                reporter_name="ชาวบ้านริมน้ำ",
                reporter_role="CITIZEN",
                description="พบสีน้ำผิดปกติบริเวณคลองพระปรง",
                district="กบินทร์บุรี",
                subdistrict="กบินทร์",
                latitude=13.991234,
                longitude=101.761234,
                exact_latitude=13.991234,
                exact_longitude=101.761234,
                public_latitude=13.99,
                public_longitude=101.76,
                contamination_signs=["น้ำเปลี่ยนสี"],
                verification_status="UNDER_VERIFICATION",
                publication_state="PUBLIC_SAFE_SUMMARY",
                provenance={"source_agency": "PublicCitizen", "category": "CITIZEN_REPORTED"},
                created_at=datetime.now(timezone.utc)
            )
        ]
        for r in reports:
            db.merge(r)
        db.commit()


def test_public_excludes_withheld_reports():
    """
    Master Prompt Section 12: Public observation listing must strictly exclude WITHHELD reports.
    """
    setup_isolated_reports()
    res = client.get("/api/public/observations")
    assert res.status_code == 200
    items = res.json()
    
    ids = [item["id"] for item in items]
    assert "obs_rep-public-real-01" in ids
    assert "obs_rep-test-fixture-01" not in ids
    assert "obs_rep-whistleblower-mock-01" not in ids
    assert "obs_rep-audit-submission-01" not in ids


def test_test_reports_not_counted_as_public():
    """
    Master Prompt Section 12: Public overview statistics must NOT count test fixtures or mocks.
    """
    setup_isolated_reports()
    res = client.get("/api/public/overview?district=กบินทร์บุรี")
    assert res.status_code == 200
    data = res.json()
    
    # Total reports must only count the 1 genuine public observation
    assert data["community_observation_count"] == 1
    assert data["total_citizen_reports"] == 1


def test_audit_reports_not_counted_as_public():
    """
    Master Prompt Section 12: Audit submissions must never be counted as public citizen activity.
    """
    setup_isolated_reports()
    res = client.get("/api/public/my-area?district=กบินทร์บุรี")
    assert res.status_code == 200
    data = res.json()
    assert data["community_observation_count"] == 1


def test_real_reports_are_visible_only_when_public():
    """
    Master Prompt Section 12: A real report marked WITHHELD or PRIVATE is immediately excluded from public API.
    """
    with SessionLocal() as db:
        report = CitizenReport(
            id="rep-unverified-withheld-01",
            reporter_name="Citizen",
            reporter_role="CITIZEN",
            description="Pending review",
            district="เมืองปราจีนบุรี",
            subdistrict="หน้าเมือง",
            latitude=14.05,
            longitude=101.38,
            exact_latitude=14.05,
            exact_longitude=101.38,
            public_latitude=14.05,
            public_longitude=101.38,
            verification_status="NEW",
            publication_state="WITHHELD",
            provenance={"source_agency": "Citizen", "category": "CITIZEN_REPORTED"},
            created_at=datetime.now(timezone.utc)
        )
        db.merge(report)
        db.commit()

    res = client.get("/api/public/observations?district=เมืองปราจีนบุรี")
    assert res.status_code == 200
    ids = [item["id"] for item in res.json()]
    assert "obs_rep-unverified-withheld-01" not in ids
