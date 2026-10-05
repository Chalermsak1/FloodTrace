from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.main import app
from apps.api.app.models.entities import IndustrialFacility


client = TestClient(app)


@pytest.fixture
def distinctive_facility(request):
    token = uuid4().hex
    values = {
        "id": f"p04a-id-{token}",
        "fid": f"p04a-fid-{token}",
        "name": f"P04A PRIVATE FACILITY {token}",
        "business_type": f"p04a-business-{token}",
        "facility_type": "105",
        "address": f"p04a-private-address-{token}",
        "subdistrict": "Containment Test",
        "district": "Containment Test",
        "province": "Test Province",
        "latitude": 7.777777,
        "longitude": 177.777777,
        "provenance": {"private_marker": f"p04a-provenance-{token}"},
    }
    with SessionLocal() as db:
        db.add(IndustrialFacility(**values))
        db.commit()

    def cleanup():
        with SessionLocal() as db:
            db.query(IndustrialFacility).filter(IndustrialFacility.id == values["id"]).delete(synchronize_session=False)
            db.commit()

    request.addfinalizer(cleanup)
    return values


def test_sensitive_routers_are_absent_from_generated_route_table():
    paths = app.openapi()["paths"]
    assert not any(path.startswith("/api/v1/factories") for path in paths)
    assert not any(path.startswith("/api/v1/risk") for path in paths)


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/v1/factories"),
        ("get", "/api/v1/factories/"),
        ("get", "/api/v1/factories/p04a-facility-id"),
        ("get", "/api/v1/factories/p04a-facility-id/"),
        ("get", "/api/v1/risk/screening"),
        ("get", "/api/v1/risk/screening/"),
        ("get", "/api/v1/risk/hotspots"),
        ("get", "/api/v1/risk/hotspots/"),
        ("get", "/api/v1/risk/explain/p04a-facility-id"),
        ("get", "/api/v1/risk/explain/p04a-facility-id/"),
        ("get", "/api/v1/risk/river-corridors"),
        ("get", "/api/v1/risk/river-corridors/"),
        ("post", "/api/v1/risk/source-estimation"),
        ("post", "/api/v1/risk/source-estimation/"),
        ("get", "/api/v1/risk/area-card/p04a-area"),
        ("get", "/api/v1/risk/area-card/p04a-area/"),
        ("get", "/api/v1/risk/connected-waterway"),
        ("get", "/api/v1/risk/connected-waterway/"),
        ("get", "/api/v1/risk/evidence-packet/p04a-case"),
        ("get", "/api/v1/risk/evidence-packet/p04a-case/"),
        ("get", "/api/v1/risk/my-area"),
        ("get", "/api/v1/risk/my-area/"),
    ],
)
def test_legacy_factory_and_risk_paths_are_not_public(method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 404


def test_public_safe_endpoints_do_not_leak_seeded_facility(distinctive_facility):
    endpoints = [
        "/api/public/overview",
        "/api/public/zones",
        "/api/public/observations",
        "/api/public/official-updates",
        "/api/public/provenance",
        "/api/v1/reports/",
        "/api/v1/telemetry/stations",
    ]
    values = [
        distinctive_facility[key]
        for key in ("id", "fid", "name", "business_type", "address", "latitude", "longitude")
    ]
    values.append(distinctive_facility["provenance"]["private_marker"])
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 200, endpoint
        serialized = response.text
        for value in values:
            assert str(value) not in serialized, f"{endpoint} leaked a seeded facility value"


@pytest.mark.parametrize("path", ["/api/internal/facilities", "/api/v1/internal/facilities"])
def test_both_internal_facility_aliases_require_current_credential(path, distinctive_facility):
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"X-Admin-Key": "invalid-p04a-key"}).status_code == 401

    response = client.get(path, headers={"X-Admin-Key": settings.ADMIN_API_KEY})
    assert response.status_code == 200
    assert any(item["id"] == distinctive_facility["id"] for item in response.json()["facilities"])
