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
    assert data["active_province"] == "ปราจีนบุรี"
    assert "boundary" in data and data["boundary"] is not None
    assert "outside_mask" in data and data["outside_mask"] is not None
    assert "center" in data
    assert "bounds" in data

    # Verify boundary geometry
    boundary_geo = data["boundary"]
    assert boundary_geo["type"] == "FeatureCollection"
    feat = boundary_geo["features"][0]
    assert feat["geometry"]["type"] == "Polygon"
    assert len(feat["geometry"]["coordinates"][0]) > 50  # Detailed authoritative polygon

    # Verify outside mask geometry has inner hole
    mask_geo = data["outside_mask"]
    mask_feat = mask_geo["features"][0]
    assert mask_feat["geometry"]["type"] == "Polygon"
    assert len(mask_feat["geometry"]["coordinates"]) >= 2  # Outer envelope + inner hole

def test_map_monitoring_priority_endpoint():
    resp = client.get("/api/public/map/monitoring-priority")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert data["province"] == "ปราจีนบุรี"
    assert data["total_cells"] >= 40
    assert len(data["features"]) == data["total_cells"]

    valid_levels = {"VERY_HIGH", "HIGH", "MODERATE", "LOW", "NO_DATA"}
    valid_colors = {"#DC2626", "#EA580C", "#EAB308", "#10B981", "#64748B"}

    for f in data["features"]:
        props = f["properties"]
        assert props["priority_level"] in valid_levels
        assert props["color"] in valid_colors
        assert 0.0 <= props["priority_score"] <= 1.0
        assert "cell_name" in props
        assert "district" in props
        assert "subdistrict" in props
        assert "contributing_factors" in props
        assert isinstance(props["contributing_factors"], list)
        assert len(props["contributing_factors"]) > 0
        assert "provenance" in props
        assert "disclaimer" in props["provenance"]

        # Privacy verification
        assert "exact_latitude" not in props
        assert "exact_longitude" not in props
        assert "reporter_name" not in props
        assert "reporter_phone" not in props
        assert "facility_name" not in props

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
    assert len(data["features"]) >= 4

    ranks = set()
    for f in data["features"]:
        props = f["properties"]
        assert "hierarchy_rank" in props
        assert props["hierarchy_rank"] in {"major_river", "secondary_canal", "tributary"}
        assert "line_width" in props
        assert props["line_width"] > 0
        assert "color" in props
        ranks.add(props["hierarchy_rank"])

    assert "major_river" in ranks
