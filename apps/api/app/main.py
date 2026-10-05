from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timezone
import os
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.private_media import private_media_ready
from apps.api.app.core.database import SessionLocal, Base, engine, get_db, reconcile_database_schema

from apps.api.app.models.entities import WaterStation, RainfallStation, Reservoir, IndustrialFacility
from apps.api.app.adapters.thaiwater import fetch_thaiwater_stations, fetch_thaiwater_rainfall
from apps.api.app.adapters.rid import fetch_rid_reservoirs
from apps.api.app.adapters.diw import load_diw_facilities

from apps.api.app.api.v1.telemetry import router as telemetry_router
from apps.api.app.api.v1.forecast import router as forecast_router
from apps.api.app.api.v1.reports import router as reports_router
from apps.api.app.api.v1.alerts import router as alerts_router
from apps.api.app.api.v1.governance import router as governance_router
from apps.api.app.api.v1.admin import router as admin_router
from apps.api.app.api.v1.admin_reports import router as admin_reports_router
from apps.api.app.api.v1.research import router as research_router
from apps.api.app.api.v1.realtime import router as realtime_router
from apps.api.app.api.public.router import public_router
from apps.api.app.api.internal.router import internal_router
from apps.api.app.core.pipeline import ingestion_pipeline
from apps.api.app.core.scheduler import source_scheduler
from apps.api.app.core.security import (
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    format_standard_error
)
from apps.api.app.core.circuit_breaker import CIRCUIT_BREAKERS
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("floodtrace")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FloodTrace Prachin Buri engine...")
    settings.validate_production_settings(raise_on_error=True)
    if not private_media_ready():
        raise RuntimeError("Private media storage is unavailable or has unsafe ownership/permissions")
    reconcile_database_schema(engine)
    
    # Database integrity & source gate reconciliation (Master Prompt Section 8)
    db = SessionLocal()
    try:
        from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
        if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION:
            diw_eval = evaluate_source_access("diw_industrial_waste", credential_override=settings.DIW_AUTHORIZED_CREDENTIAL, enforce_private_production=True)
            if diw_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
                purged = db.query(IndustrialFacility).delete()
                if purged:
                    logger.info(f"Reconciliation: Purged {purged} PUBLIC_ONLY DIW facilities from production DB.")

            tw_eval = evaluate_source_access("thaiwater_rid_runoff", credential_override=settings.THAIWATER_API_KEY, enforce_private_production=True)
            if tw_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
                purged = db.query(WaterStation).delete()
                if purged:
                    logger.info(f"Reconciliation: Purged {purged} PUBLIC_ONLY ThaiWater stations from production DB.")

            rid_eval = evaluate_source_access("thaiwater_rid_runoff", credential_override=settings.RID_PRIVATE_TOKEN, enforce_private_production=True)
            if rid_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
                purged = db.query(Reservoir).delete()
                if purged:
                    logger.info(f"Reconciliation: Purged {purged} PUBLIC_ONLY RID reservoirs from production DB.")

            db.commit()

        if not settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION:
            if db.query(IndustrialFacility).count() == 0:
                logger.info("Syncing verified DIW industrial waste facilities if authorized...")
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
                db.commit()
                if diw_items:
                    logger.info(f"Audited {len(diw_items)} DIW facilities synced.")
                
            if db.query(WaterStation).count() == 0:
                logger.info("Syncing initial ThaiWater water stations...")
                stations = await fetch_thaiwater_stations()
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
                db.commit()
                logger.info(f"Seeded {len(stations)} ThaiWater stations.")

            if db.query(RainfallStation).count() == 0:
                logger.info("Syncing initial ThaiWater rainfall stations...")
                rain_stations = await fetch_thaiwater_rainfall()
                for item in rain_stations:
                    rf = RainfallStation(
                        id=item["id"],
                        name_th=item["name_th"],
                        name_en=item["name_en"],
                        basin=item["basin"],
                        district=item["district"],
                        subdistrict=item["subdistrict"],
                        latitude=item["latitude"],
                        longitude=item["longitude"],
                        rain_24h_mm=item["rain_24h_mm"],
                        rain_1h_mm=item["rain_1h_mm"],
                        observation_time=item["observation_time"],
                        agency=item["agency"],
                        status=item["status"],
                        provenance=item["provenance"]
                    )
                    db.merge(rf)
                db.commit()
                logger.info(f"Seeded {len(rain_stations)} ThaiWater rain stations.")

            if db.query(Reservoir).count() == 0:
                logger.info("Syncing RID reservoir data...")
                reservoirs = await fetch_rid_reservoirs()
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
                db.commit()
                logger.info(f"Seeded {len(reservoirs)} RID reservoirs.")
        else:
            logger.info("Production Mode Active: External uncredentialed datasets are strictly blocked from database.")
    except Exception as e:
        logger.error(f"Error during data seeding: {e}")
    finally:
        db.close()

    ingestion_pipeline.start_worker()
    logger.info("Ingestion pipeline worker initialized.")

    if settings.ENABLE_SCHEDULER:
        source_scheduler.start()
        logger.info("Automated source scheduler initialized.")
    else:
        logger.info("Automated source scheduler disabled (ENABLE_SCHEDULER=false).")

    yield

    if settings.ENABLE_SCHEDULER:
        source_scheduler.stop()
    ingestion_pipeline.stop_worker()
    logger.info("Shutting down FloodTrace Prachin Buri engine.")


app = FastAPI(
    title="FloodTrace Prachin Buri API",
    description="Real-Data Environmental and Flood Risk Intelligence Platform for Prachin Buri, Thailand.",
    version="1.0.0",
    lifespan=lifespan
)

from starlette.exceptions import HTTPException as StarletteHTTPException

# Global Exception Handlers (Master Prompt Section 7 Standard Error Response)
@app.exception_handler(StarletteHTTPException)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    req_id = getattr(request.state, "request_id", "req_unknown")
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "RESOURCE_NOT_FOUND"
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "AUTH_ERROR"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        code = "ACCESS_DENIED"
    elif exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        code = "RATE_LIMIT_EXCEEDED"
    elif exc.status_code in (status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)):
        code = "PAYLOAD_TOO_LARGE"
    elif exc.status_code == status.HTTP_400_BAD_REQUEST:
        code = "INVALID_REQUEST"

    return format_standard_error(
        code=code,
        message=str(exc.detail),
        request_id=req_id,
        retryable=(exc.status_code in [502, 503, 504, 429]),
        status_code=exc.status_code
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "req_unknown")
    logger.error(f"Unhandled exception [request_id={req_id}]: {exc}", exc_info=True)
    response = format_standard_error(
        code="INTERNAL_SERVER_ERROR",
        message="เกิดข้อผิดพลาดในการประมวลผลภายในระบบ กรุณาลองใหม่อีกครั้งในภายหลัง",
        request_id=req_id,
        retryable=True,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    if request.url.path.startswith("/api/v1/admin/research"):
        response.headers["Cache-Control"] = "no-store"
    return response

# Middlewares (Order: RequestId -> CORS -> SecurityHeaders -> RateLimit)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)

@app.middleware("http")
async def research_no_store(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/v1/admin/research"):
        response.headers["Cache-Control"] = "no-store"
    return response

@app.middleware("http")
async def deny_removed_public_analytics(request: Request, call_next):
    if request.url.path.startswith(("/api/v1/factories", "/api/v1/risk")):
        return format_standard_error(
            code="RESOURCE_NOT_FOUND",
            message="Resource not found",
            request_id=getattr(request.state, "request_id", "req_unknown"),
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return await call_next(request)

# Mount API Routers
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(forecast_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(governance_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(admin_reports_router, prefix=settings.API_V1_STR)
app.include_router(admin_reports_router, prefix="/api")
app.include_router(research_router, prefix="/api/v1")
app.include_router(realtime_router, prefix=settings.API_V1_STR)

# Master Architecture Section 5: Dedicated Public & Internal Routers
app.include_router(public_router, prefix="/api")
app.include_router(public_router, prefix=settings.API_V1_STR)
app.include_router(internal_router, prefix="/api")
app.include_router(internal_router, prefix=settings.API_V1_STR)

# Mount production SPA assets if available
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../apps/web/dist"))
if not os.path.isdir(DIST_DIR):
    DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../web/dist"))

if os.path.isdir(DIST_DIR):
    ASSETS_DIR = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(ASSETS_DIR):
        app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="spa_assets")

@app.get("/")
def root(request: Request):
    accept_header = request.headers.get("accept", "")
    index_file = os.path.join(DIST_DIR, "index.html") if os.path.isdir(DIST_DIR) else ""
    if ("text/html" in accept_header or "application/xhtml+xml" in accept_header) and os.path.isfile(index_file):
        return FileResponse(index_file)
    if "application/json" in accept_header:
        return {
            "platform": "FloodTrace Prachin Buri",
            "description": "Environmental and Flood Risk Intelligence Platform",
            "region": "Prachin Buri, Thailand",
            "integrity_rule": "NEVER fabricate or hallucinate real-world data. Real data first, provenance always.",
            "api_v1_docs": "/docs"
        }
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {
        "platform": "FloodTrace Prachin Buri",
        "description": "Environmental and Flood Risk Intelligence Platform",
        "region": "Prachin Buri, Thailand",
        "integrity_rule": "NEVER fabricate or hallucinate real-world data. Real data first, provenance always.",
        "api_v1_docs": "/docs"
    }

# Master Prompt Section 21 & Section 18: HEALTH CHECKS (/health, /readiness, /liveness)
@app.get("/health/live")
@app.get("/health")
@app.get("/liveness")
def liveness_check():
    """
    Process Liveness Probe: Verifies application process is running and accepting HTTP requests.
    Independent of external third-party dependencies.
    """
    return {
        "status": "alive",
        "service": "FloodTrace API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "region": "Prachin Buri (14.0535° N, 101.3868° E)"
    }

@app.get("/health/ready")
@app.get("/readiness")
def readiness_check():
    """
    Production Readiness Probe: Verifies database connectivity, storage write access,
    and returns dependency degradation health.
    """
    db_status = "HEALTHY"
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        logger.error(f"Readiness check: Database connection failed: {e}")
        db_status = "UNAVAILABLE"

    storage_status = "HEALTHY" if private_media_ready() else "DEGRADED"

    is_ready = db_status == "HEALTHY" and storage_status == "HEALTHY"
    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": settings.ENVIRONMENT,
            "data_mode": settings.DATA_ENV,
            "dependencies": {
                "database": db_status,
                "storage": storage_status,
                "private_production_gate": "ACTIVE" if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION else "DEVELOPMENT"
            }
        }
    )

@app.get("/health/sources")
def sources_health_check(db: Session = Depends(get_db)):
    """Return source health from implemented paths and present evidence."""
    from pathlib import Path
    from apps.api.app.core.source_access import CANDIDATE_SOURCES_REGISTRY, canonical_source_status, evaluate_source_access, evaluate_production_eligibility
    from apps.api.app.core.scheduler import source_scheduler
    from apps.api.app.models.entities import WaterStation, RainfallStation
    from apps.api.app.core.provenance import compute_source_freshness, FreshnessStatus

    repo_root = Path(__file__).resolve().parents[3]
    water_count = db.query(WaterStation).count()
    rain_count = db.query(RainfallStation).count()
    latest_water = db.query(WaterStation).order_by(WaterStation.last_updated.desc()).first()
    latest_rain = db.query(RainfallStation).order_by(RainfallStation.last_updated.desc()).first()
    water_ts_raw = latest_water.provenance.get("original_timestamp") if latest_water and isinstance(latest_water.provenance, dict) else None
    rain_ts_raw = latest_rain.observation_time if latest_rain else None
    water_freshness, _ = compute_source_freshness(water_ts_raw)
    rain_freshness, _ = compute_source_freshness(rain_ts_raw)
    water_ts = water_ts_raw if water_freshness != FreshnessStatus.UNKNOWN else None
    rain_ts = rain_ts_raw if rain_freshness != FreshnessStatus.UNKNOWN else None
    scheduler_status = source_scheduler.get_status()
    now = datetime.now(timezone.utc)

    def has_current_request_evidence(source_status, scheduler_source):
        if source_status != "ACTIVE API" or not isinstance(scheduler_source, dict):
            return False
        started_raw = scheduler_source.get("request_started_at")
        finished_raw = scheduler_source.get("request_finished_at")
        http_status = scheduler_source.get("http_status")
        interval = scheduler_source.get("interval_seconds")
        if (not isinstance(started_raw, str) or not isinstance(finished_raw, str)
                or isinstance(http_status, bool) or http_status != 200
                or isinstance(interval, bool) or not isinstance(interval, (int, float)) or interval <= 0):
            return False
        try:
            started = datetime.fromisoformat(started_raw.replace("Z", "+00:00"))
            finished = datetime.fromisoformat(finished_raw.replace("Z", "+00:00"))
        except ValueError:
            return False
        if started.tzinfo is None or finished.tzinfo is None:
            return False
        started = started.astimezone(timezone.utc)
        finished = finished.astimezone(timezone.utc)
        age_seconds = (now - finished).total_seconds()
        return started <= finished <= now and 0 <= age_seconds <= interval

    blocked = {"gistda_disaster", "tmd_forecast", "official_dem", "diw_all_factories", "pcd_reo7_inspection", "pcd_water_quality", "dgr_groundwater", "ldd_landuse"}
    records = {}
    status_map = {"ACTIVE API": "PRODUCTION_ACTIVE", "LOCAL / VERIFIED REFERENCE": "PRODUCTION_REFERENCE", "LOCAL / UNVERIFIED": "LOCAL_UNVERIFIED", "INTERNAL": "INTERNAL", "BLOCKED": "PRODUCTION_BLOCKED", "UNAVAILABLE / UNVERIFIED": "UNAVAILABLE_UNVERIFIED"}
    for source_key, entry in CANDIDATE_SOURCES_REGISTRY.items():
        access = evaluate_source_access(source_key, credential_override=settings.THAIWATER_API_KEY if source_key.startswith("thaiwater") else None, enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION, allow_official_public=settings.ALLOW_OFFICIAL_PUBLIC_PRODUCTION)
        eligibility = evaluate_production_eligibility(source_key)
        cb = CIRCUIT_BREAKERS.get(source_key)
        sched = scheduler_status.get("sources", {}).get(source_key, {})
        timestamp = water_ts if source_key == "thaiwater_rid_runoff" else rain_ts if source_key == "thaiwater_rainfall" else None
        count = water_count if source_key == "thaiwater_rid_runoff" else rain_count if source_key == "thaiwater_rainfall" else None
        freshness = water_freshness if source_key == "thaiwater_rid_runoff" else rain_freshness if source_key == "thaiwater_rainfall" else FreshnessStatus.UNKNOWN
        source_status, source_exists, reason = canonical_source_status(source_key, repo_root)
        has_records = isinstance(count, int) and count > 0
        freshness_verified = bool(has_records and freshness == FreshnessStatus.CURRENT)
        prod_status = status_map[source_status]
        prod_allowed = source_status == "ACTIVE API" and access.ingestion_action.value == "ALLOW_PRODUCTION_INGESTION"
        production_enabled = bool(prod_allowed and has_records and freshness_verified and eligibility.verified_license_for_production)
        records[source_key] = {
            "source_id": source_key,
            "source_name": "ThaiWater water-level telemetry" if source_key == "thaiwater_rid_runoff" else "ThaiWater rainfall telemetry" if source_key == "thaiwater_rainfall" else entry["source_name"],
            "source_agency": "ThaiWater" if source_key in {"thaiwater_rid_runoff", "thaiwater_rainfall"} else entry["source_name"],
            "organization": "Hydro-Informatics Institute (HII)" if source_key in {"thaiwater_rid_runoff", "thaiwater_rainfall"} else entry["organization"],
            "source_status": source_status, "production_status": prod_status, "user_facing_status_th": source_status,
            "data_classification": "HIGH_FREQUENCY" if source_status == "ACTIVE API" else "UNAVAILABLE",
            "ingestion_mode": "EXTERNAL_API" if source_status == "ACTIVE API" else "INTERNAL" if source_status == "INTERNAL" else "BLOCKED" if source_status == "BLOCKED" else "LOCAL_UNVERIFIED",
            "latest_source_timestamp": timestamp, "database_records": count,
            "freshness_status": freshness.value,
            "reason_code": reason or ("COUNT_NOT_APPLICABLE" if count is None else "TIMESTAMP_UNAVAILABLE" if not timestamp else None),
            "private_or_public": access.private_or_public, "authorization_status": access.authorization_status.value, "ingestion_action": access.ingestion_action.value,
            "production_allowed": prod_allowed, "production_eligible": bool(eligibility.production_eligible and source_status == "ACTIVE API"),
            "verified_license": bool(eligibility.verified_license_for_production and source_status == "ACTIVE API"),
            "SOURCE_EXISTS": source_exists, "ENDPOINT_VERIFIED": bool(source_status == "ACTIVE API" and eligibility.real_endpoint),
            "ACCESS_VERIFIED": bool(source_status == "ACTIVE API" and access.ingestion_action.value == "ALLOW_PRODUCTION_INGESTION"),
            "LICENSE_VERIFIED": bool(source_status == "ACTIVE API" and eligibility.verified_license_for_production), "REAL_DATA_RECEIVED": has_records,
            "REAL_EXTERNAL_REQUEST": has_current_request_evidence(source_status, sched), "LOCAL_DATA_LOADED": source_status == "LOCAL / UNVERIFIED" and source_exists,
            "DATABASE_INGESTED": has_records, "AUTOMATED_REFRESH": bool(source_status == "ACTIVE API" and sched.get("automated_refresh") is True),
            "FRESHNESS_VERIFIED": freshness_verified, "PUBLIC_API_AVAILABLE": bool(source_status == "ACTIVE API" and has_records and freshness_verified),
            "FRONTEND_DISPLAY_VERIFIED": False, "PRODUCTION_ENABLED": production_enabled,
            "real_endpoint": eligibility.real_endpoint if source_status == "ACTIVE API" else None,
            "circuit_breaker": cb.get_status() if cb else {"state": "UNKNOWN", "healthy": False},
        }
    counts = {"TOTAL_EXTERNAL_SOURCES": len(records)}
    for key, predicate in {
        "REAL_EXTERNAL_API_SOURCES": lambda x: x["source_status"] == "ACTIVE API", "AUTOMATED_PRODUCTION_SOURCES": lambda x: x["AUTOMATED_REFRESH"],
        "PRODUCTION_REFERENCE_SOURCES": lambda x: x["source_status"] == "LOCAL / VERIFIED REFERENCE", "LOCAL_ONLY_SOURCES": lambda x: x["source_status"] == "LOCAL / UNVERIFIED",
        "BLOCKED_SOURCES": lambda x: x["source_status"] == "BLOCKED", "TEST_ONLY_SOURCES": lambda x: x["source_status"] == "INTERNAL",
    }.items():
        counts[key] = sum(1 for item in records.values() if predicate(item))
    return {"status": "monitored", "timestamp": datetime.now(timezone.utc).isoformat(), "total_sources_evaluated": len(records), "production_counts": counts, "sources": records}


@app.get("/health/metrics")
def health_metrics():
    """
    Master Prompt Section 48 & 49: Observability, Metrics, and Alerting Thresholds.
    """
    stats = ingestion_pipeline.get_stats()
    cb_status = {k: v.get_status() for k, v in CIRCUIT_BREAKERS.items()}
    open_cbs = [k for k, v in cb_status.items() if v.get("state") == "OPEN"]
    
    # Alert level classification
    alert_level = "INFO"
    alert_reasons = []
    if open_cbs:
        alert_level = "WARNING"
        alert_reasons.append(f"Circuit breakers open for sources: {open_cbs}")
    if stats.get("queue_depth", 0) > 500:
        alert_level = "CRITICAL"
        alert_reasons.append(f"Queue backlog high: {stats.get('queue_depth')}")

    return {
        "status": "healthy" if alert_level == "INFO" else "degraded",
        "alert_level": alert_level,
        "alert_reasons": alert_reasons,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pipeline": stats,
        "circuit_breakers": cb_status
    }

# Master Production Architecture: Client-Side SPA Page Routing Fallback
if os.path.isdir(DIST_DIR):
    @app.get("/{full_path:path}")
    async def serve_spa_page_fallback(full_path: str):
        if full_path.startswith(("api/", "api", "docs", "redoc", "openapi.json", "health", "uploads", "liveness", "readiness")):
            raise HTTPException(status_code=404, detail="Resource not found")
        candidate = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Page not found")
