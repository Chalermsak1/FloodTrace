from fastapi import APIRouter, Query, HTTPException
from apps.api.app.adapters.openmeteo import STATIONS_COORDINATES, get_forecast_selector

router = APIRouter(prefix="/forecast", tags=["Meteorological & Flood Forecast"])

@router.get("/")
async def get_forecast(
    station: str = Query("prachin_mueang", description="Deprecated alias for an application forecast selector")
):
    try:
        selector = get_forecast_selector(station)
    except ValueError:
        raise HTTPException(status_code=400, detail={"error": "INVALID_REQUEST", "message": "Unknown forecast selector"})
    return {"status": "FORECAST_UNAVAILABLE", "reason": "ACCESS_BLOCKED", "forecast_days": [], "selector": selector, "source_provenance": None}

@router.get("/stations")
def get_available_forecast_stations():
    return [
        get_forecast_selector(k)
        for k, v in STATIONS_COORDINATES.items()
    ]
