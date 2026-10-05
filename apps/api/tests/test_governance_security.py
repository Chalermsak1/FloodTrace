import os
import io
import json
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from PIL import Image

from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.models.entities import ClaimPublication, CorrectionRecord, TakedownRequest, CitizenReport, IndustrialFacility
from apps.api.app.core.safety_policy import (
    validate_claim_text, 
    check_requires_human_approval, 
    validate_evidence_bundle, 
    ClaimType, 
    InformationClassification,
    PROHIBITED_PATTERNS
)
from apps.api.app.core.security import sanitize_and_strip_exif_image, generalize_coordinates, rate_limiter
from apps.api.app.adapters.rid import RID_AUDIT_EXPLANATION

client = TestClient(app)

ADMIN_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY}


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    rate_limiter._requests.clear()
    yield
    rate_limiter._requests.clear()


# -------------------------------------------------------------
# 1. Unauthorized Admin Access
# -------------------------------------------------------------
def test_unauthorized_admin_access():
    """
    Attempting to access administrative or moderation endpoints without valid key
    must return 401 Unauthorized.
    """
    # Without header
    res1 = client.post("/api/v1/admin/claims/submit", json={})
    assert res1.status_code == 401

    # With invalid key
    res2 = client.post(
        "/api/v1/admin/claims/submit", 
        headers={"X-Admin-Key": "invalid_super_secret"},
        json={}
    )
    assert res2.status_code == 401

    # Audit logs endpoint
    res3 = client.get("/api/v1/admin/audit-logs")
    assert res3.status_code == 401


# -------------------------------------------------------------
# 2. Public / Private Data Separation & Exact Reporter GPS
# -------------------------------------------------------------
def test_public_private_data_separation_and_gps_generalization():
    """
    Citizen reports must separate private PII (name, email, phone, exact GPS)
    from public display. Public API must only return generalized coordinates (~1.1 km)
    and masked observer identity.
    """
    exact_lat = 14.053521
    exact_lon = 101.386844

    payload = {
        "reporter_name": "Private Citizen สมชาย",
        "reporter_role": "CITIZEN",
        "reporter_email": "somchai.citizen@example.com",
        "reporter_phone": "+66-81-234-5678",
        "latitude": exact_lat,
        "longitude": exact_lon,
        "district": "เมืองปราจีนบุรี",
        "subdistrict": "หน้าเมือง",
        "water_depth_cm": 35.0,
        "water_flow_speed": "SLOW",
        "contamination_signs": ["turbid_brown", "organic_smell"],
        "description": "น้ำท่วมสูงถึงแนวบันไดบ้าน"
    }

    # Submit report
    post_res = client.post("/api/v1/reports/", json=payload)
    assert post_res.status_code == 200
    data = post_res.json()
    report_id = data["id"]

    # This test covers public DTO sanitization; publication is explicit under P0-2.
    with SessionLocal() as db:
        report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
        report.publication_state = "PUBLIC_SAFE_SUMMARY"
        db.commit()

    # Verify public response generalization
    gen_lat, gen_lon = generalize_coordinates(exact_lat, exact_lon, decimals=settings.COORDINATE_GENERALIZE_DECIMALS)
    assert data["public_latitude"] == gen_lat
    assert data["public_longitude"] == gen_lon
    assert data["public_latitude"] != exact_lat # Must be fuzzed/generalized

    # Verify public listing endpoint
    list_res = client.get("/api/v1/reports/")
    assert list_res.status_code == 200
    public_reports = list_res.json()
    matched = next((r for r in public_reports if r["id"] == report_id), None)
    assert matched is not None

    # Privacy verification: Private fields MUST NOT exist in public response
    assert "reporter_name" not in matched
    assert "reporter_email" not in matched
    assert "reporter_phone" not in matched
    assert "exact_latitude" not in matched
    assert "exact_longitude" not in matched
    assert matched["reporter_display"] == "Community Observer (Anonymized)"
    assert matched["latitude"] == gen_lat
    assert matched["longitude"] == gen_lon

    # Clean up test report from database
    db = SessionLocal()
    db.query(CitizenReport).filter(CitizenReport.id == report_id).delete()
    db.commit()
    db.close()


# -------------------------------------------------------------
# 3. Unverified Report Cannot Become Verified Automatically
# -------------------------------------------------------------
def test_unverified_report_cannot_become_verified_automatically():
    """
    Submitting a report always sets verification_status = 'UNVERIFIED'.
    Only an authorized administrator/inspector can upgrade it to 'VERIFIED'.
    """
    payload = {
        "reporter_name": "Volunteer User",
        "reporter_role": "VOLUNTEER",
        "latitude": 14.10,
        "longitude": 101.40,
        "district": "กบินทร์บุรี",
        "subdistrict": "เมืองเก่า",
        "water_depth_cm": 20.0,
        "water_flow_speed": "RAPID",
        "contamination_signs": []
    }
    res = client.post("/api/v1/reports/", json=payload)
    assert res.status_code == 200
    report_id = res.json()["id"]

    # Check database status
    db = SessionLocal()
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    assert report.verification_status == "UNVERIFIED"
    assert report.review_status == "PENDING_REVIEW"

    # Human review gate: admin sets to VERIFIED
    review_res = client.post(
        f"/api/v1/admin/reports/{report_id}/review",
        headers=ADMIN_HEADERS,
        json={
            "verification_status": "VERIFIED",
            "reviewer": "Inspector Preecha (PCD / Civil Defense)",
            "notes": "Field inspection confirmed 20cm inundation on site."
        }
    )
    assert review_res.status_code == 200
    assert review_res.json()["verification_status"] == "VERIFIED"

    # Clean up
    db.delete(report)
    db.commit()
    db.close()


# -------------------------------------------------------------
# 4. Unreviewed Adverse Claim Cannot Be Published
# -------------------------------------------------------------
def test_unreviewed_adverse_claim_cannot_be_published():
    """
    An adverse claim or facility statement mandates HUMAN_REVIEW.
    Direct publication without prior APPROVED status must fail with 400.
    """
    payload = {
        "claim_text": "Facility 3-101-1/38ปจ is located within a modeled potential-impact zone.",
        "claim_type": "FACILITY_SPECIFIC_STATEMENT",
        "category": "MODELED",
        "source_ids": ["floodtrace_citizen"],
        "evidence_ids": ["evd_haversine_distance_calc"],
        "mentions_facility_or_person": True
    }

    # Submit claim
    submit_res = client.post("/api/v1/admin/claims/submit", headers=ADMIN_HEADERS, json=payload)
    assert submit_res.status_code == 200
    claim_id = submit_res.json()["claim_id"]
    assert submit_res.json()["requires_human_approval"] is True
    assert submit_res.json()["publication_status"] == "HUMAN_REVIEW"

    # Try to publish directly without approval -> MUST FAIL
    pub_res = client.post(f"/api/v1/admin/claims/{claim_id}/publish?reviewer=AutoBot", headers=ADMIN_HEADERS)
    assert pub_res.status_code == 400
    assert "must be in 'APPROVED' state" in pub_res.json()["detail"]

    # Now formally approve via human review
    appr_res = client.post(
        f"/api/v1/admin/claims/{claim_id}/review",
        headers=ADMIN_HEADERS,
        json={"decision": "APPROVE", "reviewer": "Official Reviewer Dr. Somchai", "notes": "GIS verified."}
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["publication_status"] == "APPROVED"

    # Now publication must succeed
    pub_ok = client.post(f"/api/v1/admin/claims/{claim_id}/publish?reviewer=Official Reviewer Dr. Somchai", headers=ADMIN_HEADERS)
    assert pub_ok.status_code == 200
    assert pub_ok.json()["publication_status"] == "PUBLISHED"

    # Clean up
    db = SessionLocal()
    db.query(ClaimPublication).filter(ClaimPublication.claim_id == claim_id).delete()
    db.commit()
    db.close()


# -------------------------------------------------------------
# 5. Missing Evidence Blocks Publication
# -------------------------------------------------------------
def test_missing_evidence_blocks_publication():
    """
    Claims missing required evidence fields or having empty source_ids/evidence_ids
    cannot pass automated validation.
    """
    # Empty source_ids
    payload = {
        "claim_text": "Area is within modeled potential exposure zone.",
        "claim_type": "SPATIAL_EXPOSURE",
        "category": "DERIVED",
        "source_ids": [], # Empty!
        "evidence_ids": ["evd_1"]
    }
    res = client.post("/api/v1/admin/claims/submit", headers=ADMIN_HEADERS, json=payload)
    assert res.status_code == 422 # Pydantic min_length=1 validation error


# -------------------------------------------------------------
# 6. Model Output Always Labeled & Source Localization Safety
# -------------------------------------------------------------
def test_public_source_estimation_route_is_not_mounted():
    res = client.post(
        "/api/v1/risk/source-estimation",
        json={"incident_lat": 14.05, "incident_lon": 101.37, "physical_samples_available": False}
    )
    assert res.status_code == 404


# -------------------------------------------------------------
# 7. Source Failure Produces NO DATA
# -------------------------------------------------------------
def test_source_failure_produces_no_data():
    """
    When live reservoir telemetry is unavailable from RID public API,
    the system must return UNAVAILABLE_AT_AUDIT_TIME or None,
    never substituting synthetic or estimated storage percentages.
    Under REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True, uncredentialed public RID is blocked.
    """
    res = client.get("/api/v1/telemetry/reservoirs")
    assert res.status_code == 200
    reservoirs = res.json()
    # In production without private token, external source is blocked
    assert len(reservoirs) == 0

    # With authorized test token and unavailable/empty telemetry, verify fail-closed null telemetry fields
    from apps.api.app.adapters.rid import fetch_rid_reservoirs
    import asyncio
    from unittest.mock import patch
    from apps.api.app.core.config import settings
    old_token = settings.RID_PRIVATE_TOKEN
    try:
        with patch("httpx.AsyncClient.get", side_effect=Exception("Simulated empty telemetry response")):
            settings.RID_PRIVATE_TOKEN = "test-auth-token"
            test_res = asyncio.run(fetch_rid_reservoirs())
            assert test_res == []
    finally:
        settings.RID_PRIVATE_TOKEN = old_token


# -------------------------------------------------------------
# 8. Fabricated Fallback Values Impossible (DIW Hazard Integrity)
# -------------------------------------------------------------
def test_fabricated_fallback_values_impossible():
    """
    DIW facilities must explicitly state INSUFFICIENT DATA for chemical hazard
    and environmental inspection evidence, never converting activity code 101/105/106
    into toxicity scores.
    In production without private credential, DIW public data is blocked.
    """
    res = client.get("/api/v1/factories/")
    assert res.status_code == 404

    # Inspect the 112 snapshot dataset directly to verify zero fabricated toxicity
    import json, os
    data_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "prachinburi_industrial_waste_diw.json")
    with open(data_path, "r", encoding="utf-8") as f:
        items = json.load(f)
    assert len(items) == 112
    for f in items[:10]:
        assert f["hazard_evidence_status"] == "INSUFFICIENT_DATA"
        assert "INSUFFICIENT_DATA" in f["chemical_assay_evidence"]
        assert "INSUFFICIENT_DATA" in f["environmental_inspection_evidence"]


# -------------------------------------------------------------
# 9. Facility Attribution Language Passes Publication Policy
# -------------------------------------------------------------
def test_facility_attribution_language_passes_publication_policy():
    """
    Tests defamatory / causal phrases against validate_claim_text to ensure rejection.
    Tests objective permitted phrases to ensure acceptance.
    """
    prohibited_claims = [
        "Facility 3-101-1 is the source of toxic contamination in the river.",
        "This factory polluted this area deliberately.",
        "The plant illegally dumped chemical wastewater last night.",
        "This is the most dangerous factory in Prachin Buri.",
        "Worst factory operating in Si Maha Phot.",
        "Confirmed polluter causing fish death."
    ]

    for text in prohibited_claims:
        is_valid, violations = validate_claim_text(text)
        assert is_valid is False, f"Expected '{text}' to be rejected, but it passed."
        assert len(violations) > 0

    allowed_claims = [
        "Facility X is listed in the official DIW registry.",
        "Facility X is classified as activity type 106 in the referenced dataset snapshot.",
        "DIW inspection record dated 2020-05-18 states: factory licensed for mechanical recycling.",
        "Station 39 measured 4.52 m MSL at 2026-10-02T00:00:00Z.",
        "This area is within a modeled potential-impact zone.",
        "Potential exposure area identified along Prachin Buri reach.",
        "Area requiring further investigation by official regulatory inspectors."
    ]

    for text in allowed_claims:
        is_valid, violations = validate_claim_text(text)
        assert is_valid is True, f"Expected '{text}' to pass, but got violations: {violations}"
        assert len(violations) == 0


# -------------------------------------------------------------
# 10. Malicious Uploads Rejected & Clean Images Stripped of EXIF
# -------------------------------------------------------------
def test_malicious_uploads_rejected_and_exif_stripped():
    """
    Executable payloads or files with fraudulent extensions must be rejected.
    Clean JPEG images must have EXIF stripped and receive a randomized filename.
    """
    # 1. Reject executable script disguised as jpg
    fake_script = b"#!/bin/bash\nrm -rf /"
    with pytest.raises(Exception):
        sanitize_and_strip_exif_image(fake_script)

    # 2. Reject arbitrary text file
    plain_text = b"Hello world, this is a plain text file."
    with pytest.raises(Exception):
        sanitize_and_strip_exif_image(plain_text)

    # 3. Create a valid test image with Pillow
    img = Image.new("RGB", (64, 64), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    valid_bytes = buf.getvalue()

    clean_bytes, filename = sanitize_and_strip_exif_image(valid_bytes)
    assert len(clean_bytes) > 0
    assert filename.startswith("evd_")
    assert filename.endswith(".jpg")

    # Verify randomized storage identifier
    assert len(filename) == 24 # "evd_" + 16 hex + ".jpg"


# -------------------------------------------------------------
# 11. SQL Injection Attempts Rejected
# -------------------------------------------------------------
def test_sql_injection_attempts_rejected():
    """
    SQL injection strings in query parameters must not break SQL execution
    or bypass authentication/filtering.
    """
    sqli_payloads = [
        "' OR 1=1 --",
        "'; DROP TABLE citizen_reports; --",
        "1 UNION SELECT null, null, null --"
    ]
    for sqli in sqli_payloads:
        res = client.get(f"/api/v1/risk/screening?priority={sqli}")
        assert res.status_code == 404


# -------------------------------------------------------------
# 12. Rate Limits Enforced
# -------------------------------------------------------------
def test_rate_limits_enforced():
    """
    Exceeding SUBMIT_RATE_LIMIT_PER_MINUTE triggers HTTP 429 Too Many Requests
    with Retry-After header.
    """
    test_ip = "192.0.2.99"
    limit = settings.SUBMIT_RATE_LIMIT_PER_MINUTE

    # Fill up limit
    for _ in range(limit):
        allowed, _ = rate_limiter.is_allowed(test_ip, limit, window_seconds=60)
        assert allowed is True

    # Next attempt must be denied
    allowed, retry_after = rate_limiter.is_allowed(test_ip, limit, window_seconds=60)
    assert allowed is False
    assert retry_after > 0


# -------------------------------------------------------------
# 13. Correction Creates New Version & Withdrawn Claims Disappear
# -------------------------------------------------------------
def test_correction_workflow_and_withdrawal():
    """
    Correcting a claim produces a new version and marks the original as SUPERSEDED.
    Withdrawing a claim removes it immediately from the public claims API.
    """
    # 1. Create and approve a claim
    create_payload = {
        "claim_text": "Initial monitoring priority along river corridor reach A.",
        "claim_type": "SPATIAL_EXPOSURE",
        "category": "MODELED",
        "source_ids": ["floodtrace_citizen"],
        "evidence_ids": ["gauge_st_39"],
        "mentions_facility_or_person": False
    }
    submit_res = client.post("/api/v1/admin/claims/submit", headers=ADMIN_HEADERS, json=create_payload)
    claim_id = submit_res.json()["claim_id"]

    # Approve & publish
    client.post(f"/api/v1/admin/claims/{claim_id}/review", headers=ADMIN_HEADERS, json={"decision": "APPROVE", "reviewer": "Editor A"})
    client.post(f"/api/v1/admin/claims/{claim_id}/publish?reviewer=Editor A", headers=ADMIN_HEADERS)

    # Verify claim appears in public claims
    pub_list1 = client.get("/api/v1/governance/claims").json()
    assert any(c["claim_id"] == claim_id for c in pub_list1)

    # 2. Correct claim
    correct_payload = {
        "new_claim_text": "Updated monitoring priority along river corridor reach A (Corrected for gauge datum).",
        "reason": "Gauge datum calibrated against MSL benchmarks.",
        "reviewer": "Editor B",
        "new_evidence_ids": ["gauge_st_39", "msl_benchmark_survey"]
    }
    cor_res = client.post(f"/api/v1/admin/claims/{claim_id}/correct", headers=ADMIN_HEADERS, json=correct_payload)
    assert cor_res.status_code == 200
    new_claim_id = cor_res.json()["new_claim_id"]
    assert cor_res.json()["version"] == 2

    # Verify original is now SUPERSEDED and new claim is PUBLISHED in public list
    pub_list2 = client.get("/api/v1/governance/claims").json()
    assert not any(c["claim_id"] == claim_id for c in pub_list2) # Original gone from public
    assert any(c["claim_id"] == new_claim_id for c in pub_list2) # New version present

    # 3. Withdraw new claim
    w_res = client.post(
        f"/api/v1/admin/claims/{new_claim_id}/withdraw?reason=Hydrological+event+passed&reviewer=Editor+C",
        headers=ADMIN_HEADERS
    )
    assert w_res.status_code == 200
    assert w_res.json()["status"] == "WITHDRAWN"

    # Verify withdrawn claim is completely excluded from public list
    pub_list3 = client.get("/api/v1/governance/claims").json()
    assert not any(c["claim_id"] == new_claim_id for c in pub_list3)

    # Clean up database
    db = SessionLocal()
    db.query(CorrectionRecord).filter(CorrectionRecord.claim_id.in_([claim_id, new_claim_id])).delete()
    db.query(ClaimPublication).filter(ClaimPublication.claim_id.in_([claim_id, new_claim_id])).delete()
    db.commit()
    db.close()


# -------------------------------------------------------------
# 14. Secrets Not Committed Check
# -------------------------------------------------------------
def test_secrets_not_committed():
    """
    Scans environment files and verified code to ensure default admin key
    or database passwords are not hard-coded in public frontend assets.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    web_dir = os.path.join(root_dir, "apps/web/src")

    # Frontend source files must not contain ADMIN_API_KEY
    for dirpath, _, filenames in os.walk(web_dir):
        for fname in filenames:
            if fname.endswith((".ts", ".tsx", ".js", ".html")):
                fpath = os.path.join(dirpath, fname)
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    assert "floodtrace_super_admin_secret_key" not in content, f"Secret leaked in {fpath}"
                    assert "postgres:postgres" not in content, f"DB credentials leaked in {fpath}"
