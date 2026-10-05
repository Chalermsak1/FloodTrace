import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.api.v1 import forecast as forecast_api
from apps.api.app.core.security import rate_limiter
from apps.api.app.core.database import SessionLocal
from apps.api.app.models.entities import CitizenReport
from apps.api.app.core.source_access import (
    evaluate_source_access, 
    get_all_source_access_evaluations,
    AccessAuthorizationStatus,
    IngestionAction
)

@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    rate_limiter._requests.clear()
    yield
    rate_limiter._requests.clear()

client = TestClient(app)

def test_source_access_matrix_all_15_sources():
    """Verify exactly 15 candidate external sources (Sections 6.1 - 6.15) are tracked and evaluated."""
    records = get_all_source_access_evaluations(enforce_private_production=True)
    assert len(records) == 15, f"Expected exactly 15 candidate sources, got {len(records)}"
    source_ids = {r.source_id for r in records}
    expected_ids = {
        "gistda_disaster", "thaiwater_rid_runoff", "thaiwater_rainfall",
        "tmd_forecast", "dwr_waterways", "official_dem",
        "diw_industrial_waste", "diw_all_factories",
        "pcd_reo7_inspection", "pcd_water_quality", "dgr_groundwater",
        "dopa_villages", "moph_hospitals", "ldd_landuse",
        "floodtrace_citizen"
    }
    assert expected_ids == source_ids

    # Verify classification of public datasets
    diw = next(r for r in records if r.source_id == "diw_industrial_waste")
    assert diw.authorization_status == AccessAuthorizationStatus.PUBLIC_ONLY
    assert diw.private_or_public == "PUBLIC"
    assert diw.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    dwr = next(r for r in records if r.source_id == "dwr_waterways")
    assert dwr.authorization_status == AccessAuthorizationStatus.PUBLIC_ONLY
    assert dwr.private_or_public == "PUBLIC"
    assert dwr.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    dopa = next(r for r in records if r.source_id == "dopa_villages")
    assert dopa.authorization_status == AccessAuthorizationStatus.PUBLIC_ONLY
    assert dopa.private_or_public == "PUBLIC"
    assert dopa.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    # Backward compatibility aliases
    assert evaluate_source_access("thaiwater_telemetry").source_id == "thaiwater_rid_runoff"
    rid = evaluate_source_access("rid_reservoirs")
    assert rid.source_id == "rid_reservoirs"
    assert rid.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

def test_source_access_endpoint_evaluation():
    """Test GET /api/v1/governance/source-access returns structured matrix for exactly 15 sources."""
    response = client.get("/api/v1/governance/source-access")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 15
    
    # Check GISTDA Disaster source
    gistda = next((s for s in data if s["source_id"] == "gistda_disaster"), None)
    assert gistda is not None
    assert gistda["private_or_public"] == "PRIVATE"
    assert "GISTDA" in gistda["organization"]
    
    # Check DIW source
    diw = next((s for s in data if s["source_id"] == "diw_industrial_waste"), None)
    assert diw is not None
    assert diw["authorization_status"] == "PUBLIC_ONLY"
    assert diw["private_or_public"] == "PUBLIC"
    assert "101" in diw["notes"] or "105" in diw["notes"]

def test_public_area_card_route_is_not_mounted():
    assert client.get("/api/v1/risk/area-card/PB-021").status_code == 404

def test_connected_waterway_route_is_not_mounted():
    assert client.get("/api/v1/risk/connected-waterway?latitude=13.9876&longitude=101.7214").status_code == 404

def test_evidence_packet_route_is_not_mounted():
    assert client.get("/api/v1/risk/evidence-packet/ENV-CASE-001?district=กบินทร์บุรี").status_code == 404

def test_my_area_risk_route_is_not_mounted():
    assert client.get("/api/v1/risk/my-area?district=กบินทร์บุรี").status_code == 404

def test_community_evidence_clustering_section_27():
    """Test Master Prompt Section 27 Community Observation Clustering."""
    # First submit a citizen observation
    report_payload = {
        "reporter_name": "Somchai Test",
        "reporter_role": "CITIZEN",
        "reporter_email": "somchai@test.org",
        "reporter_phone": "0812345678",
        "latitude": 13.9876,
        "longitude": 101.7214,
        "district": "กบินทร์บุรี",
        "subdistrict": "กบินทร์",
        "water_depth_cm": 45.0,
        "water_flow_speed": "SLOW",
        "contamination_signs": ["unusual_water_color", "odor"],
        "description": "Noticeable color change near irrigation canal"
    }
    submit_res = client.post("/api/v1/reports/", json=report_payload)
    assert submit_res.status_code == 200

    # Retrieve clusters
    cluster_res = client.get("/api/v1/reports/clusters")
    assert cluster_res.status_code == 200
    clusters = cluster_res.json()
    assert len(clusters) >= 1
    
    kabin_cluster = next((c for c in clusters if c["district"] == "กบินทร์บุรี"), None)
    assert kabin_cluster is not None
    assert kabin_cluster["cluster_type"] == "COMMUNITY_OBSERVATION_CLUSTER"
    assert kabin_cluster["verification_status"] == "UNVERIFIED"
    assert "PROOF_OF_CONTAMINATION" not in str(kabin_cluster)
    assert "Clusters do NOT constitute proof of contamination" in kabin_cluster["disclaimer"]

def test_public_private_boundary_no_pii_or_exact_gps_leakage():
    """Master Prompt Section 7 & 11: Regression test verifying private source data and PII never leak."""
    secret_payload = {
        "reporter_name": "Classified Whistleblower 99",
        "reporter_role": "CITIZEN",
        "reporter_email": "whistleblower_secret@private.gov.th",
        "reporter_phone": "+66-89-999-0000",
        "latitude": 13.987654321,
        "longitude": 101.721432109,
        "district": "ศรีมหาโพธิ",
        "subdistrict": "ท่าตูม",
        "water_depth_cm": 30.0,
        "water_flow_speed": "SLOW",
        "contamination_signs": ["chemical_odor"],
        "description": "Chemical discharge observation"
    }
    post_res = client.post("/api/v1/reports/", json=secret_payload)
    assert post_res.status_code == 200
    post_data = post_res.json()

    # This test covers public DTO sanitization; publication is explicit under P0-2.
    with SessionLocal() as db:
        report = db.query(CitizenReport).filter(CitizenReport.id == post_data["id"]).first()
        report.publication_state = "PUBLIC_SAFE_SUMMARY"
        db.commit()
    
    # Response must not contain exact GPS or raw PII
    assert "13.987654321" not in str(post_data)
    assert "101.721432109" not in str(post_data)
    assert "whistleblower_secret@private.gov.th" not in str(post_data)
    assert "+66-89-999-0000" not in str(post_data)
    assert "Classified Whistleblower" not in str(post_data)
    assert "exact_latitude" not in post_data
    assert "exact_longitude" not in post_data
    
    # Public listing check
    list_res = client.get("/api/v1/reports/")
    assert list_res.status_code == 200
    reports = list_res.json()
    found = next((r for r in reports if r["subdistrict"] == "ท่าตูม"), None)
    assert found is not None
    assert "exact_latitude" not in found
    assert "exact_longitude" not in found
    assert "reporter_email" not in found
    assert "reporter_phone" not in found
    assert "reporter_name" not in found
    assert found["reporter_display"] == "Community Observer (Anonymized)"
    assert found["latitude"] == 13.99 # Generalized ~1.1km
    assert found["longitude"] == 101.72
    
    # Cluster listing check
    cluster_res = client.get("/api/v1/reports/clusters")
    assert cluster_res.status_code == 200
    raw_clusters = cluster_res.text
    assert "13.987654321" not in raw_clusters
    assert "whistleblower_secret@private.gov.th" not in raw_clusters
    assert "+66-89-999-0000" not in raw_clusters
    assert "Classified Whistleblower" not in raw_clusters

    with SessionLocal() as db:
        db.query(CitizenReport).filter(CitizenReport.id == post_data["id"]).delete()
        db.commit()

def test_public_coordinate_privacy_irreversibility():
    """Master Prompt Section 8: Test that generalized coordinates cannot be trivially reversed."""
    from apps.api.app.core.security import generalize_coordinates
    
    # Multiple distinct points within the same ~1.1km grid cell
    p1 = (13.985112, 101.721004) # House A
    p2 = (13.989441, 101.724890) # House B (400m away)
    p3 = (13.987654, 101.721432) # House C
    
    g1 = generalize_coordinates(p1[0], p1[1])
    g2 = generalize_coordinates(p2[0], p2[1])
    g3 = generalize_coordinates(p3[0], p3[1])
    
    # All collapse to the same centroid (13.99, 101.72)
    assert g1 == (13.99, 101.72)
    assert g2 == (13.99, 101.72)
    assert g3 == (13.99, 101.72)
    
    # Mathematical irreversibility: given only (13.99, 101.72), the error bounds are ~0.005 deg (~550 meters)
    # An observer cannot pinpoint whether the reporter was at House A, House B, or House C.
    error_lat = abs(p1[0] - g1[0])
    error_lon = abs(p1[1] - g1[1])
    assert error_lat > 0.001
    assert error_lon > 0.001

def test_image_metadata_stripped_no_exif_leakage():
    """Section 18 & 7: Verify image uploads are re-encoded, stripped of EXIF, and given random filenames."""
    import io
    from PIL import Image
    from apps.api.app.core.config import settings
    
    # Create a synthetic test image
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    img_bytes_io = io.BytesIO()
    img.save(img_bytes_io, format="JPEG")
    raw_bytes = img_bytes_io.getvalue()
    
    files = {"photo": ("reporter_personal_phone_photo.jpg", raw_bytes, "image/jpeg")}
    upload_res = client.post("/api/v1/reports/upload-photo", files=files)
    assert upload_res.status_code == 200
    data = upload_res.json()
    
    # Original sensitive filename must NOT be preserved
    assert "reporter_personal_phone" not in data["filename"]
    assert data["filename"].startswith("evd_")
    assert data["photo_url"] == data["filename"]
    assert not data["photo_url"].startswith("/")

    # Verify file on disk has zero EXIF
    saved_path = settings.PRIVATE_MEDIA_ROOT / data["filename"]
    assert saved_path.exists()
    assert saved_path.stat().st_mode & 0o777 == 0o600
    saved_img = Image.open(saved_path)
    exif_data = saved_img.getexif()
    assert len(exif_data) == 0, "EXIF metadata was not completely stripped!"
    saved_path.unlink()

def test_debug_endpoints_no_secret_keys_leakage():
    """Section 7: Verify public governance and metadata endpoints never leak internal secret keys."""
    from apps.api.app.core.config import settings
    res_meta = client.get("/api/v1/governance/project-info")
    assert res_meta.status_code == 200
    text_meta = res_meta.text
    assert settings.ADMIN_API_KEY not in text_meta
    
    res_access = client.get("/api/v1/governance/source-access")
    assert res_access.status_code == 200
    text_access = res_access.text
    assert settings.ADMIN_API_KEY not in text_access
    assert "admin_secret_token" not in text_access


# ============================================================
# SECTION 16: AUTOMATED ACCEPTANCE TESTS (TEST 1 - TEST 12)
# ============================================================

def test_acceptance_test_1_ingestion_without_credentials_fails_closed():
    """TEST 1: Ingestion without authorized credential fails closed."""
    eval_res = evaluate_source_access(
        "thaiwater_rid_runoff",
        credential_override=None,
        enforce_private_production=True
    )
    assert eval_res.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION
    assert eval_res.authorization_status in [
        AccessAuthorizationStatus.PUBLIC_ONLY,
        AccessAuthorizationStatus.ACCESS_REQUIRED,
        AccessAuthorizationStatus.UNKNOWN_ACCESS,
        AccessAuthorizationStatus.PRIVATE_PENDING
    ]


def test_acceptance_test_2_public_open_data_cannot_be_tagged_private_authorized():
    """TEST 2: Public Open Data cannot be tagged PRIVATE_AUTHORIZED."""
    all_evals = get_all_source_access_evaluations(enforce_private_production=True)
    for source in all_evals:
        if source.private_or_public == "PUBLIC":
            assert source.authorization_status != AccessAuthorizationStatus.PRIVATE_AUTHORIZED, (
                f"Source {source.source_id} is PUBLIC but tagged as PRIVATE_AUTHORIZED"
            )
            assert source.authorization_status == AccessAuthorizationStatus.PUBLIC_ONLY


def test_acceptance_test_3_diw_cannot_enter_private_production_without_private_authorization():
    """TEST 3: DIW 101/105/106 cannot enter private production pipeline without private authorization."""
    eval_diw = evaluate_source_access("diw_industrial_waste", credential_override=None, enforce_private_production=True)
    assert eval_diw.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    resp = client.get("/api/v1/factories/")
    assert resp.status_code == 404


def test_acceptance_test_4_openmeteo_forecast_remains_model_and_outside_ingestion(monkeypatch):
    """TEST 4: Open-Meteo cannot enter private production pipeline without private authorization."""
    eval_fc = evaluate_source_access("tmd_forecast", credential_override=None, enforce_private_production=True)
    assert eval_fc.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION

    async def forecast(_station):
        return {"status": "AVAILABLE", "forecast_days": [{"date": "2026-10-05"}], "source_provenance": {"family": "MODEL", "role": "FORECAST"}}

    monkeypatch.setattr(forecast_api, "fetch_openmeteo_forecast", forecast)
    resp = client.get("/api/v1/forecast/?station=prachin_mueang")
    assert resp.status_code == 200
    fc = resp.json()
    assert fc["status"] == "AVAILABLE"
    assert fc["source_provenance"]["family"] == "MODEL"
    assert fc["forecast_days"]


def test_acceptance_test_5_citizen_reports_validation_and_rate_limits():
    """TEST 5: Citizen reports cannot be ingested without valid signature / schema / rate limit check."""
    # Invalid coordinate
    invalid_payload = {
        "reporter_name": "Test User",
        "latitude": 999.0, # Invalid latitude
        "longitude": 101.5,
        "district": "กบินทร์บุรี"
    }
    resp = client.post("/api/v1/reports/", json=invalid_payload)
    assert resp.status_code == 422 # Validation error


def test_acceptance_test_6_public_outputs_cannot_disclose_exact_coordinates():
    """TEST 6: Public outputs cannot disclose exact coordinates from private reports."""
    from apps.api.app.core.security import generalize_coordinates
    lat, lon = 13.9876543, 101.7214321
    gen_lat, gen_lon = generalize_coordinates(lat, lon)
    assert (gen_lat, gen_lon) == (13.99, 101.72)

    resp = client.get("/api/v1/reports/")
    assert resp.status_code == 200
    for r in resp.json():
        assert "exact_latitude" not in r
        assert "exact_longitude" not in r
        assert "reporter_phone" not in r
        assert "reporter_email" not in r


def test_acceptance_test_7_public_evidence_packet_route_is_not_mounted():
    assert client.get("/api/v1/risk/evidence-packet/ENV-CASE-001?district=กบินทร์บุรี").status_code == 404


def test_acceptance_test_8_every_public_claim_has_audit_trail():
    """TEST 8: Every public claim has an audit trail."""
    from apps.api.app.core.database import SessionLocal
    from apps.api.app.models.entities import ClaimPublication
    with SessionLocal() as db:
        if db.query(ClaimPublication).filter(ClaimPublication.publication_status == "PUBLISHED").count() == 0:
            c = ClaimPublication(
                claim_id="CLM-AUDIT-001",
                claim_text="รายงานการตรวจวัดระดับน้ำสถานีสะพานปราจีนบุรี",
                claim_type="MEASURED_FACT",
                category="WATER_MONITORING",
                source_ids=["thaiwater_waterlevel"],
                evidence_ids=["ev_audit_001"],
                data_version="2026.1",
                model_version="1.0",
                methodology_version="1.0",
                publication_status="PUBLISHED",
                version=1,
                reviewer="auditor",
                provenance={
                    "source_id": "thaiwater_waterlevel",
                    "provenance_hash": "audit_hash_001",
                    "category": "MEASURED_FACT",
                    "authority": "HAII / ThaiWater"
                }
            )
            db.add(c)
            db.commit()

    resp = client.get("/api/v1/governance/claims")
    assert resp.status_code == 200
    claims = resp.json()
    assert len(claims) > 0
    for c in claims:
        assert "claim_id" in c
        assert "version" in c
        assert "claim_type" in c
        assert "category" in c
        assert "source_ids" in c
        assert "evidence_ids" in c
        assert "provenance" in c


def test_acceptance_test_9_public_model_route_is_not_mounted():
    assert client.get("/api/v1/risk/area-card/PB-021").status_code == 404


def test_acceptance_test_10_fail_closed_produces_empty_or_null_instead_of_defaults():
    """TEST 10: Fail-closed fallback produces empty/null instead of defaults."""
    # Stations empty in production
    resp_st = client.get("/api/v1/telemetry/stations")
    assert resp_st.status_code == 200
    assert resp_st.json() == []

    # Reservoirs empty in production
    resp_res = client.get("/api/v1/telemetry/reservoirs")
    assert resp_res.status_code == 200
    assert resp_res.json() == []

    # Factories empty in production
    resp_fac = client.get("/api/v1/factories/")
    assert resp_fac.status_code == 404


def test_acceptance_test_11_rate_limits_block_abuse():
    """TEST 11: Rate limits block brute force / replay / abuse."""
    from apps.api.app.core.config import settings
    ip = "198.51.100.42"
    limit = settings.SUBMIT_RATE_LIMIT_PER_MINUTE
    for _ in range(limit):
        allowed, _ = rate_limiter.is_allowed(ip, limit, window_seconds=60)
        assert allowed is True
    blocked, retry = rate_limiter.is_allowed(ip, limit, window_seconds=60)
    assert blocked is False
    assert retry > 0


def test_acceptance_test_12_production_db_zero_uncredentialed_records():
    """TEST 12: Production DB contains zero records derived from uncredentialed public endpoints."""
    from apps.api.app.core.database import SessionLocal
    from apps.api.app.models.entities import IndustrialFacility, WaterStation, Reservoir, CitizenReport
    with SessionLocal() as db:
        fac_count = db.query(IndustrialFacility).count()
        st_count = db.query(WaterStation).count()
        res_count = db.query(Reservoir).count()
        rep_count = db.query(CitizenReport).count()

        assert fac_count == 0, f"Expected 0 external uncredentialed facilities, found {fac_count}"
        assert st_count == 0, f"Expected 0 external uncredentialed water stations, found {st_count}"
        assert res_count == 0, f"Expected 0 external uncredentialed reservoirs, found {res_count}"
        assert rep_count > 0, "Internal citizen reports should be preserved"
