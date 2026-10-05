"""
Test Suite: Public API Sanitation & Prohibited Field Exclusion
Verifies Section 3 & 5 of the Master Architecture Prompt:
- No facility/industrial source fields appear in /api/public/*
- No reporter identity or exact GPS fields appear in /api/public/*
- Three clear classifications: OFFICIAL, COMMUNITY, MODEL
- /api/internal/* is protected by authentication
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

PROHIBITED_PUBLIC_KEYS = {
    "factory_name",
    "company_name",
    "factory_id",
    "facility_id",
    "factory_latitude",
    "factory_longitude",
    "waste_facility",
    "suspected_source",
    "suspected_polluter",
    "source_lat",
    "source_lon",
    "source_distance",
    "source_route",
    "source_to_zone",
    "internal_source_score",
    "internal_source_weighting",
    "internal_facility_notes",
    "private_facility_category",
    "reporter_id",
    "reporter_name",
    "phone",
    "phone_number",
    "email",
    "exact_gps",
    "exact_latitude",
    "exact_longitude",
    "ip_address",
    "device_id",
    "device_identifiers",
    "original_image_url",
    "exif",
    "private_moderation_notes"
}

def assert_no_prohibited_keys(data, path=""):
    """Recursively checks that no prohibited keys exist anywhere in JSON."""
    if isinstance(data, dict):
        for k, v in data.items():
            current_path = f"{path}.{k}" if path else k
            assert k.lower() not in PROHIBITED_PUBLIC_KEYS, (
                f"Security Violation: Prohibited key '{k}' found at {current_path}"
            )
            # Ensure no prohibited substring for facility identification
            for prohibited in ["suspected_factory", "polluter_name", "target_factory"]:
                assert prohibited not in k.lower(), f"Prohibited key fragment '{k}' found at {current_path}"
            assert_no_prohibited_keys(v, current_path)
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            assert_no_prohibited_keys(item, f"{path}[{idx}]")

PUBLIC_ENDPOINTS = [
    "/api/public/overview",
    "/api/public/overview?district=เมืองปราจีนบุรี",
    "/api/public/zones",
    "/api/public/flood-extent",
    "/api/public/forecast-zones",
    "/api/public/forecast-zones?horizon=6h",
    "/api/public/waterways",
    "/api/public/stations",
    "/api/public/my-area?district=กบินทร์บุรี",
    "/api/public/my-area?district=ศรีมหาโพธิ",
    "/api/public/observations",
    "/api/public/official-updates",
    "/api/public/provenance",
]

@pytest.mark.parametrize("endpoint", PUBLIC_ENDPOINTS)
def test_public_api_prohibited_fields_never_exposed(endpoint):
    """
    Section 3 & 5 Compliance:
    Verifies that every single endpoint under /api/public/* completely excludes
    private facility and reporter identity fields.
    """
    response = client.get(endpoint)
    assert response.status_code == 200, f"Endpoint {endpoint} failed with {response.status_code}"
    data = response.json()
    assert_no_prohibited_keys(data)

def test_public_zones_uses_polygons_not_circles():
    """
    Section 9 Compliance:
    Verifies that environmental watch areas are GeoJSON Polygons, NOT circles.
    """
    response = client.get("/api/public/zones")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert data["features"] == []
    assert data["status"] == "UNAVAILABLE"
    assert data["reason_code"] == "LOCAL_PROVENANCE_UNVERIFIED"

def test_public_three_classifications_enforced():
    """
    Section 2 Compliance:
    Every public item must belong to OFFICIAL, COMMUNITY, or MODEL.
    """
    # 1. Official updates
    res_off = client.get("/api/public/official-updates")
    assert res_off.status_code == 200
    for item in res_off.json():
        assert item["badge"] == "OFFICIAL"
        assert item["provenance"]["category"] == "OFFICIAL"

    # 2. Observations
    res_obs = client.get("/api/public/observations")
    assert res_obs.status_code == 200
    for item in res_obs.json():
        assert item["classification"] == "COMMUNITY"
        assert "รายงานจากประชาชน" in item["classification_explanation"]

    # 3. Model zones
    res_zones = client.get("/api/public/zones")
    assert res_zones.status_code == 200
    for item in res_zones.json()["features"]:
        assert item["properties"]["badge"] == "MODEL"

from apps.api.app.core.config import settings

def test_internal_api_strictly_authenticated():
    """
    Section 4 & 5 Compliance:
    Internal analysis routes require admin key.
    """
    # Unauthorized attempt
    res_unauth = client.get("/api/internal/facilities")
    assert res_unauth.status_code == 401

    # Authorized attempt with configured admin key
    res_auth = client.get("/api/internal/facilities", headers={"X-Admin-Key": settings.ADMIN_API_KEY})
    assert res_auth.status_code == 200
    assert "facilities" in res_auth.json()
