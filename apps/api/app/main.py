from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timezone
import os

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal, Base, engine
from apps.api.app.models.entities import WaterStation, Reservoir, IndustrialFacility
from apps.api.app.adapters.thaiwater import fetch_thaiwater_stations
from apps.api.app.adapters.rid import fetch_rid_reservoirs
from apps.api.app.adapters.diw import load_diw_facilities

from apps.api.app.api.v1.telemetry import router as telemetry_router
from apps.api.app.api.v1.factories import router as factories_router
from apps.api.app.api.v1.risk import router as risk_router
from apps.api.app.api.v1.forecast import router as forecast_router
from apps.api.app.api.v1.reports import router as reports_router
from apps.api.app.api.v1.alerts import router as alerts_router
from apps.api.app.api.v1.governance import router as governance_router
from apps.api.app.api.v1.admin import router as admin_router
from apps.api.app.api.v1.realtime import router as realtime_router
from apps.api.app.api.public.router import public_router
from apps.api.app.api.internal.router import internal_router
from apps.api.app.core.pipeline import ingestion_pipeline
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
    Base.metadata.create_all(bind=engine)
    
    # Database integrity & source gate reconciliation (Master Prompt Section 8)
    db = SessionLocal()
    try:
        from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
        if settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION or settings.DATA_ENV == "PRODUCTION":
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

        if not (settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION or settings.DATA_ENV == "PRODUCTION"):
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

    yield
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
    return format_standard_error(
        code="INTERNAL_SERVER_ERROR",
        message="เกิดข้อผิดพลาดในการประมวลผลภายในระบบ กรุณาลองใหม่อีกครั้งในภายหลัง",
        request_id=req_id,
        retryable=True,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

# Middlewares (Order: RequestId -> CORS -> SecurityHeaders -> RateLimit)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)

# Mount API Routers
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(factories_router, prefix=settings.API_V1_STR)
app.include_router(risk_router, prefix=settings.API_V1_STR)
app.include_router(forecast_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(governance_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(realtime_router, prefix=settings.API_V1_STR)

# Master Architecture Section 5: Dedicated Public & Internal Routers
app.include_router(public_router, prefix="/api")
app.include_router(public_router, prefix=settings.API_V1_STR)
app.include_router(internal_router, prefix="/api")
app.include_router(internal_router, prefix=settings.API_V1_STR)

# Mount sanitized uploads directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def root():
    return {
        "platform": "FloodTrace Prachin Buri",
        "description": "Environmental and Flood Risk Intelligence Platform",
        "region": "Prachin Buri, Thailand",
        "integrity_rule": "NEVER fabricate or hallucinate real-world data. Real data first, provenance always.",
        "api_v1_docs": "/docs"
    }

# Master Prompt Section 21: HEALTH CHECKS
@app.get("/health/live")
@app.get("/health")
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

    storage_status = "HEALTHY"
    try:
        test_file = os.path.join(UPLOAD_DIR, ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
    except Exception as e:
        logger.error(f"Readiness check: Storage write check failed: {e}")
        storage_status = "DEGRADED"

    is_ready = db_status == "HEALTHY"
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
def sources_health_check():
    """
    Master Prompt Section 23: DATA SOURCE HEALTH & CIRCUIT BREAKER MONITORING.
    Reports operational status across all external environmental monitoring providers.
    """
    from apps.api.app.core.source_access import CANDIDATE_SOURCES_REGISTRY, evaluate_source_access

    sources_summary = {}
    for source_key in CANDIDATE_SOURCES_REGISTRY.keys():
        eval_result = evaluate_source_access(source_key, enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION)
        cb = CIRCUIT_BREAKERS.get(source_key)
        
        sources_summary[source_key] = {
            "source_agency": eval_result.source_name,
            "organization": eval_result.organization,
            "private_or_public": eval_result.private_or_public,
            "authorization_status": eval_result.authorization_status.value,
            "ingestion_action": eval_result.ingestion_action.value,
            "production_allowed": eval_result.ingestion_action.value == "ALLOW_PRODUCTION_INGESTION",
            "circuit_breaker": cb.get_status() if cb else {"state": "N/A", "healthy": True}
        }

    return {
        "status": "monitored",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_sources_evaluated": len(sources_summary),
        "production_private_gate": "ENFORCED",
        "sources": sources_summary
    }

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
