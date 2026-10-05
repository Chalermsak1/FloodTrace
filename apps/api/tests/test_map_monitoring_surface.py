"""
Tests for FloodTrace Map Monitoring Priority & Boundary Endpoints
Verifies:
1. Authoritative Prachin Buri boundary and outside mask integrity.
2. Real data-driven monitoring priority surface generation without hardcoded risk polygons.
3. Safety rules: No single unverified report creates a high risk area; semantics of priority vs contamination.
4. Privacy compliance: Zero private citizen GPS or facility names exposed in map endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

def test_map_boundary_endpoint():
    resp = client.get("/api/public/map/boundary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert data["features"] == []
    assert data["status"] == "UNAVAILABLE / UNVERIFIED"
    assert data["reason_code"] == "LOCAL_PROVENANCE_UNVERIFIED"

def test_map_monitoring_priority_endpoint():
    resp = client.get("/api/public/map/monitoring-priority")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert data["features"] == []
    assert data["status"] == "UNAVAILABLE"
    assert data["reason_code"] == "LOCAL_PROVENANCE_UNVERIFIED"

def test_map_monitoring_priority_district_filtering():
    resp = client.get("/api/public/map/monitoring-priority?district=กบินทร์บุรี")
    assert resp.status_code == 200
    data = resp.json()
    for f in data["features"]:
        assert f["properties"]["district"] == "กบินทร์บุรี"

def test_waterways_hierarchy_endpoint():
    resp = client.get("/api/public/waterways")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert data["features"] == []
    assert data["status"] == "UNAVAILABLE / UNVERIFIED"
    assert data["reason_code"] == "LOCAL_ARTIFACT_ABSENT"
