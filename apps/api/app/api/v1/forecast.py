from fastapi import APIRouter, Query, HTTPException
from apps.api.app.adapters.openmeteo import STATIONS_COORDINATES, get_forecast_selector, fetch_openmeteo_forecast

router = APIRouter(prefix="/forecast", tags=["Meteorological & Flood Forecast"])

@router.get("/")
async def get_forecast(
    station: str = Query("prachin_mueang", description="Application forecast selector; not an official station")
):
    try:
        get_forecast_selector(station)
    except ValueError:
        raise HTTPException(status_code=400, detail={"error": "INVALID_REQUEST", "message": "Unknown forecast selector"})
    return await fetch_openmeteo_forecast(station)

@router.get("/stations")
def get_available_forecast_stations():
    return [
        get_forecast_selector(k)
        for k, v in STATIONS_COORDINATES.items()
    ]
