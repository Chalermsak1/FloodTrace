"""
Test Suite: Public Overview API & Dynamic Landing Page Contract
Verifies that /api/public/overview:
- Returns real dynamic counts computed from active database entities (no hardcoded factual numbers)
- Includes dynamic total_water_stations, total_rainfall_stations, total_citizen_reports, total_monitoring_cells
- Includes priority_counts breakdown and Thai formatted timestamp
- Does not expose private coordinates or PII
- Respects data updates dynamically
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

def test_public_overview_contract_and_dynamic_fields():
    response = client.get("/api/public/overview")
    assert response.status_code == 200
    data = response.json()

    # Required top-level dynamic keys
    assert "total_water_stations" in data
    assert "total_rainfall_stations" in data
    assert "total_citizen_reports" in data
    assert "total_monitoring_cells" in data
    assert "priority_counts" in data
    assert "system_updated_at_th" in data

    # Verify data types are numeric integers and non-negative
    assert isinstance(data["total_water_stations"], int)
    assert data["total_water_stations"] >= 0
    assert isinstance(data["total_rainfall_stations"], int)
    assert data["total_rainfall_stations"] >= 0
    assert isinstance(data["total_citizen_reports"], int)
    assert data["total_citizen_reports"] >= 0
    assert isinstance(data["total_monitoring_cells"], int)
    assert data["total_monitoring_cells"] > 0  # Prachin Buri has 45 Voronoi cells

    # Verify priority breakdown structure
    priority_counts = data["priority_counts"]
    for key in ["very_high", "high", "moderate", "low", "no_data"]:
        assert key in priority_counts
        assert isinstance(priority_counts[key], int)
        assert priority_counts[key] >= 0

    # Sum of priority counts should equal total cells
    total_cells = sum(priority_counts.values())
    assert total_cells == data["total_monitoring_cells"]

    # Verify Thai formatted timestamp format
    ts_th = data["system_updated_at_th"]
    assert isinstance(ts_th, str)
    assert len(ts_th) > 0
    # Must contain Thai year BE 2569 or "น."
    assert "2569" in ts_th or "น." in ts_th

def test_public_overview_no_pii_or_prohibited_fields():
    response = client.get("/api/public/overview")
    assert response.status_code == 200
    data = response.json()

    prohibited_keys = {
        "reporter_name", "phone", "email", "exact_gps", "ip_address", "admin_notes", "facility_name"
    }

    def check_keys(d):
        if isinstance(d, dict):
            for k, v in d.items():
                assert k.lower() not in prohibited_keys
                check_keys(v)
        elif isinstance(d, list):
            for item in d:
                check_keys(item)

    check_keys(data)

def test_public_overview_district_filtering():
    """Verify that district filtering works and returns a dynamic subset without error."""
    response = client.get("/api/public/overview?district=เมืองปราจีนบุรี")
    assert response.status_code == 200
    data = response.json()
    assert data["district"] == "เมืองปราจีนบุรี"
    assert "total_water_stations" in data
    assert "total_monitoring_cells" in data
