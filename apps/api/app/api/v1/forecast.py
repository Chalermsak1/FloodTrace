from fastapi import APIRouter, Query
from apps.api.app.adapters.openmeteo import fetch_openmeteo_forecast, STATIONS_COORDINATES

router = APIRouter(prefix="/forecast", tags=["Meteorological & Flood Forecast"])

@router.get("/")
async def get_forecast(
    station: str = Query("prachin_mueang", description="prachin_mueang, kabin_buri, or si_maha_phot"),
    test_mode: bool = Query(False, description="Isolated development/test execution only; blocked in production")
):
    """
    Returns 7-day numerical weather prediction and flood risk projection.
    Master Prompt Section 2 & 10:
    In PRODUCTION: Returns FORECAST_UNAVAILABLE / ACCESS_REQUIRED because public endpoints are blocked.
    In TEST: Allows isolated test execution.
    """
    return await fetch_openmeteo_forecast(station, is_test_mode=test_mode)

@router.get("/stations")
def get_available_forecast_stations():
    return [
        {"key": k, "name": v["name"], "lat": v["lat"], "lon": v["lon"]}
        for k, v in STATIONS_COORDINATES.items()
    ]
