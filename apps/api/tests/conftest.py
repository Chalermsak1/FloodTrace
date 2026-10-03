import sys
import os
import pytest
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

# ------------------------------------------------------------------
# TEST DATABASE ISOLATION (Final Real-World Readiness Audit)
# The suite deletes station/facility tables and inserts fixture citizen
# reports. It MUST NEVER run against the live database. The URL is set
# before the app config is imported so the engine binds to the test DB.
# ------------------------------------------------------------------
os.environ["DATABASE_URL"] = os.environ.get(
    "FLOODTRACE_TEST_DATABASE_URL",
    "postgresql://chalermsak:@localhost:5432/floodtrace_test_db",
)
if "test" not in os.environ["DATABASE_URL"].rsplit("/", 1)[-1]:
    raise RuntimeError(
        "Refusing to run tests: DATABASE_URL does not point to a dedicated *test* database."
    )

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal, engine, reconcile_database_schema
from apps.api.app.models.entities import IndustrialFacility, WaterStation, Reservoir, RainfallStation

assert "test" in str(engine.url).rsplit("/", 1)[-1], "Test engine is not bound to a test database"
reconcile_database_schema(engine)

orig_env = settings.DATA_ENV
orig_gate = settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION

# Enforce strict production audit mode during test suite collection and execution
settings.DATA_ENV = "PRODUCTION"
settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True

@pytest.fixture(autouse=True)
def reset_rate_limiter_each_test():
    """Clear in-memory rate limiter between test cases to prevent 429 cascades."""
    from apps.api.app.core.security import rate_limiter
    rate_limiter._requests.clear()
    yield
    rate_limiter._requests.clear()


@pytest.fixture(scope="session", autouse=True)
def enforce_production_isolation_during_tests():
    """
    Ensure the automated audit suite runs in strict PRODUCTION isolation mode (TEST 1-12),
    and cleanly restores the active DEVELOPMENT data after tests complete so the user can
    interactively test and use the web application.
    """
    from apps.api.app.adapters.diw import load_diw_facilities
    from apps.api.app.adapters.thaiwater import fetch_thaiwater_stations, fetch_thaiwater_rainfall
    from apps.api.app.adapters.rid import fetch_rid_reservoirs

    settings.DATA_ENV = "PRODUCTION"
    settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True

    # Purge external uncredentialed records during audit tests
    with SessionLocal() as db:
        db.query(IndustrialFacility).delete()
        db.query(WaterStation).delete()
        db.query(RainfallStation).delete()
        db.query(Reservoir).delete()
        db.commit()

    yield

    # Restore environment settings
    settings.DATA_ENV = orig_env
    settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = orig_gate

    # If in development mode, restore active real data for testing the platform
    if not orig_gate:
        with SessionLocal() as db:
            diw_items = load_diw_facilities()
            for item in diw_items:
                f = IndustrialFacility(
                    id=item["id"],
                    fid=item.get("fid"),
                    name=item["name"],
                    business_type=item["business_type"],
                    facility_type=item["facility_type"],
                    official_activity_category=item.get("official_activity_category"),
                    address=item.get("address"),
                    subdistrict=item["subdistrict"],
                    district=item["district"],
                    province=item.get("province", "ปราจีนบุรี"),
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    horsepower=item.get("horsepower", 0.0),
                    workers=item.get("workers", 0),
                    capital=item.get("capital", 0.0),
                    official_licensed_capacity=item.get("official_licensed_capacity"),
                    hazard_evidence_status=item.get("hazard_evidence_status", "INSUFFICIENT_DATA"),
                    hazard_classification=item.get("hazard_classification", "NOT_AVAILABLE_IN_REGISTRY"),
                    chemical_assay_evidence=item.get("chemical_assay_evidence", "INSUFFICIENT_DATA — No chemical lab assays published in DIW registry"),
                    environmental_inspection_evidence=item.get("environmental_inspection_evidence", "INSUFFICIENT_DATA — No PCD inspection violations reported in registry"),
                    provenance=item["provenance"]
                )
                db.merge(f)

            stations = asyncio.run(fetch_thaiwater_stations())
            for item in stations:
                st = WaterStation(
                    id=item["id"],
                    name_th=item["name_th"],
                    name_en=item["name_en"],
                    basin=item["basin"],
                    district=item["district"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    water_level_msl=item["water_level_msl"],
                    ground_level_msl=item["ground_level_msl"],
                    warning_level_msl=item["warning_level_msl"],
                    critical_level_msl=item["critical_level_msl"],
                    status=item["status"],
                    provenance=item["provenance"]
                )
                db.merge(st)

            reservoirs = asyncio.run(fetch_rid_reservoirs())
            for item in reservoirs:
                r = Reservoir(
                    id=item["id"],
                    name_th=item["name_th"],
                    capacity_mcm=item["capacity_mcm"],
                    storage_mcm=item["storage_mcm"],
                    storage_percent=item["storage_percent"],
                    inflow_mcm_day=item["inflow_mcm_day"],
                    outflow_mcm_day=item["outflow_mcm_day"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    district=item["district"],
                    provenance=item["provenance"]
                )
                db.merge(r)

            rain_stations = asyncio.run(fetch_thaiwater_rainfall())
            for item in rain_stations:
                rs = RainfallStation(
                    id=item["id"],
                    name_th=item["name_th"],
                    name_en=item.get("name_en"),
                    district=item.get("district"),
                    subdistrict=item.get("subdistrict"),
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    rain_24h_mm=item.get("rain_24h_mm"),
                    rain_1h_mm=item.get("rain_1h_mm"),
                    observation_time=item.get("observation_time"),
                    agency=item.get("agency"),
                    status=item.get("status", "RAINFALL_RECORDED"),
                    provenance=item["provenance"]
                )
                db.merge(rs)

            db.commit()
