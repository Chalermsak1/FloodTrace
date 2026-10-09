import asyncio
import logging
import uuid
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Callable
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.core.circuit_breaker import get_circuit_breaker, ErrorClassification
from apps.api.app.core.pipeline import event_broadcaster
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
from apps.api.app.models.entities import (
    WaterStation,
    RainfallStation,
    WaterLevelObservation,
    RainfallObservation
)
from apps.api.app.adapters.thaiwater import fetch_thaiwater_stations, fetch_thaiwater_rainfall
from apps.api.app.adapters.rid import fetch_rid_reservoirs
from apps.api.app.adapters.openmeteo import fetch_openmeteo_forecast
from apps.api.app.core.datetime_utils import parse_thaiwater_timestamp, FutureTimestampError, BANGKOK_TZ
from apps.api.app.core.provenance import compute_source_freshness, FreshnessStatus, DataCategory

logger = logging.getLogger(__name__)

class SourceScheduleConfig:
    """
    Source-Aware Configuration Model (Master Spec Section 4, 28, 43).
    Encapsulates source timing, nominal cadence, polling strategy, resilience and data category.
    """
    def __init__(
        self,
        source_id: str,
        dataset: str,
        interval_seconds: int,
        fetcher: Callable,
        source_name: Optional[str] = None,
        data_type: str = "WATER_LEVEL",
        nominal_interval: int = 900,
        poll_interval: Optional[int] = None,
        freshness_warning_threshold: Optional[float] = None,
        freshness_stale_threshold: Optional[float] = None,
        timeout_seconds: float = 20.0,
        max_retries: int = 3,
        backoff_base: float = 2.0,
        supports_latest: bool = True,
        supports_incremental_query: bool = False,
        supports_historical_backfill: bool = False,
        data_category: str = "MEASURED_FACT",
        automated_refresh: bool = True
    ):
        self.source_id = source_id
        self.source_name = source_name or source_id
        self.dataset = dataset
        self.nominal_interval = nominal_interval
        # Poll interval is separate from nominal upstream cadence (Section 4 & 28)
        self.poll_interval = poll_interval or interval_seconds
        self.interval_seconds = nominal_interval  # Canonical upstream interval (900s for ThaiWater)
        self.freshness_warning_threshold = freshness_warning_threshold or (nominal_interval * 1.5)
        self.freshness_stale_threshold = freshness_stale_threshold or (nominal_interval * 3.0)
        self.fetcher = fetcher
        self.data_type = data_type
        self.data_category = data_category
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.supports_latest = supports_latest
        self.supports_incremental_query = supports_incremental_query
        self.supports_historical_backfill = supports_historical_backfill
        self.automated_refresh = automated_refresh


class SourceScheduler:
    """
    Robust Near-Real-Time Environmental Monitoring Scheduler (Sections 4, 6, 7, 8, 9, 12, 13, 14, 17, 27).
    
    Features:
    - Source-aware polling cadences (never polls static datasets; adapts to upstream cadences)
    - Full Timing Model: observed_at, ingested_at, processed_at, published_at
    - Strict Data Freshness Engine: LIVE, RECENT, DELAYED, STALE, OFFLINE, UNKNOWN
    - Idempotent Ingestion & Handling of Upstream Corrected Observations
    - Fail-Closed Circuit Breaker with Exponential Backoff and Jitter
    - Observable Structured Metrics & Source-level Health Visibility
    - Incremental Downstream Derivation & Real-Time SSE Broadcasting
    """
    def __init__(self):
        self._configs: Dict[str, SourceScheduleConfig] = {
            "thaiwater_rid_runoff": SourceScheduleConfig(
                source_id="thaiwater_rid_runoff",
                source_name="ThaiWater / RID Water Level Telemetry",
                dataset="waterlevel_load",
                data_type="WATER_LEVEL",
                data_category="MEASURED_FACT",
                nominal_interval=900,  # 15 minutes upstream cadence
                poll_interval=settings.THAIWATER_POLL_INTERVAL,  # Configurable safe polling
                interval_seconds=settings.THAIWATER_POLL_INTERVAL,
                freshness_warning_threshold=settings.FRESHNESS_WARNING_SECONDS,
                freshness_stale_threshold=settings.FRESHNESS_STALE_SECONDS,
                fetcher=fetch_thaiwater_stations,
                timeout_seconds=settings.SOURCE_TIMEOUT_SECONDS,
                max_retries=settings.SOURCE_MAX_RETRIES,
                backoff_base=settings.SOURCE_BACKOFF_BASE,
                supports_latest=True,
                automated_refresh=True
            ),
            "thaiwater_rainfall": SourceScheduleConfig(
                source_id="thaiwater_rainfall",
                source_name="ThaiWater / TMD Automatic Rain Gauge Network",
                dataset="rain_24h",
                data_type="RAINFALL",
                data_category="MEASURED_FACT",
                nominal_interval=900,  # 15 minutes upstream cadence
                poll_interval=settings.THAIWATER_POLL_INTERVAL,  # Configurable safe polling
                interval_seconds=settings.THAIWATER_POLL_INTERVAL,
                freshness_warning_threshold=settings.FRESHNESS_WARNING_SECONDS,
                freshness_stale_threshold=settings.FRESHNESS_STALE_SECONDS,
                fetcher=fetch_thaiwater_rainfall,
                timeout_seconds=settings.SOURCE_TIMEOUT_SECONDS,
                max_retries=settings.SOURCE_MAX_RETRIES,
                backoff_base=settings.SOURCE_BACKOFF_BASE,
                supports_latest=True,
                automated_refresh=True
            ),
            "openmeteo_forecast": SourceScheduleConfig(
                source_id="openmeteo_forecast",
                source_name="Open-Meteo Numerical Weather Prediction",
                dataset="weather_forecast",
                data_type="FORECAST",
                data_category="FORECAST",  # NEVER presented as real-time measured observation (Section 4, 30)
                nominal_interval=3600,     # 1 hour model update
                poll_interval=settings.OPENMETEO_POLL_INTERVAL,
                interval_seconds=settings.OPENMETEO_POLL_INTERVAL,
                fetcher=lambda: fetch_openmeteo_forecast("prachin_mueang"),
                timeout_seconds=settings.SOURCE_TIMEOUT_SECONDS,
                max_retries=2,
                supports_latest=True,
                automated_refresh=False    # Handled via test mode or authorized scheduler
            ),
            "rid_reservoirs": SourceScheduleConfig(
                source_id="rid_reservoirs",
                source_name="Royal Irrigation Department Reservoir Status",
                dataset="reservoir_storage",
                data_type="RESERVOIR",
                data_category="OFFICIAL_RECORD",
                nominal_interval=86400,    # Daily observation report
                poll_interval=settings.RID_POLL_INTERVAL,
                interval_seconds=settings.RID_POLL_INTERVAL,
                fetcher=fetch_rid_reservoirs,
                timeout_seconds=settings.SOURCE_TIMEOUT_SECONDS,
                max_retries=2,
                supports_latest=True,
                automated_refresh=False
            ),
            # Reference datasets are explicitly NOT polled over external networks (Section 4)
            "dwr_waterways": SourceScheduleConfig(
                source_id="dwr_waterways",
                source_name="Department of Water Resources River Geometry",
                dataset="waterways_geometry",
                data_type="REFERENCE",
                data_category="OFFICIAL_RECORD",
                nominal_interval=86400 * 30, # Static monthly reference
                interval_seconds=86400 * 30,
                fetcher=lambda: [],
                automated_refresh=False
            ),
            "diw_industrial_waste": SourceScheduleConfig(
                source_id="diw_industrial_waste",
                source_name="Department of Industrial Works Facility Registry",
                dataset="waste_processors",
                data_type="REFERENCE",
                data_category="OFFICIAL_RECORD",
                nominal_interval=86400 * 30, # Historical reference
                interval_seconds=86400 * 30,
                fetcher=lambda: [],
                automated_refresh=False
            )
        }
        self._stats: Dict[str, Dict[str, Any]] = {}
        for s_id in self._configs:
            cfg = self._configs[s_id]
            self._stats[s_id] = {
                "source_id": s_id,
                "source_name": cfg.source_name,
                "dataset": cfg.dataset,
                "data_type": cfg.data_type,
                "data_category": cfg.data_category,
                "automated_refresh": cfg.automated_refresh,
                "nominal_interval_seconds": cfg.nominal_interval,
                "poll_interval_seconds": cfg.poll_interval,
                "interval_seconds": cfg.nominal_interval,
                "total_runs": 0,
                "total_successes": 0,
                "consecutive_failures": 0,
                "consecutive_successes": 0,
                "scheduler_started_at": None,
                "last_run": None,
                "last_success": None,
                "last_attempt_at": None,
                "last_observed_at": None,
                "last_error": None,
                "request_started_at": None,
                "request_finished_at": None,
                "http_status": None,
                "latency_ms": None,
                "ingestion_latency_ms": None,
                "processing_latency_ms": None,
                "records_received_last_run": 0,
                "records_inserted_last_run": 0,
                "records_updated_last_run": 0,
                "duplicates_skipped_last_run": 0,
                "rejected_last_run": 0,
                "parse_error_count": 0,
                "timeout_count": 0,
                "rate_limit_count": 0,
                "source_timestamp_raw": None,
                "source_timezone": "Asia/Bangkok (UTC+07:00)",
                "normalized_timestamp_utc": None,
                "normalized_timestamp_asia_bangkok": None,
                "newest_source_timestamp": None,
                "latest_source_timestamp": None,
                "retrieved_at": None,
                "data_age_seconds": None,
                "source_delay_seconds": None,
                "freshness_status": FreshnessStatus.UNKNOWN.value,
                "next_run_at": None,
                "circuit_breaker_status": "CLOSED",
                "is_running": False
            }
        self._tasks: List[asyncio.Task] = []
        self._running = False
        self._started_at: Optional[str] = None

    def get_status(self) -> Dict[str, Any]:
        """Returns the current operational status of the scheduler and all sources."""
        now = datetime.now(timezone.utc)
        result = {
            "scheduler_active": self._running,
            "system_time": now.isoformat(),
            "sources": {}
        }
        for s_id, stat in self._stats.items():
            cb = get_circuit_breaker(s_id)
            stat["circuit_breaker_status"] = cb.state.value
            stat["circuit_breaker_failures"] = cb.failure_count
            result["sources"][s_id] = dict(stat)
        return result

    def get_source_status(self, source_id: str) -> Optional[Dict[str, Any]]:
        return self._stats.get(source_id)

    async def run_source_now(self, source_id: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Executes a single automated ingestion run for a source immediately.
        Used by background worker loop, manual admin trigger, and truth verification audit.
        """
        if source_id not in self._configs:
            return {"status": "ERROR", "message": f"Unknown source {source_id}"}

        cfg = self._configs[source_id]
        stat = self._stats[source_id]
        stat["is_running"] = True
        stat["total_runs"] += 1

        t0 = time.perf_counter()
        now_start = datetime.now(timezone.utc)
        stat["request_started_at"] = now_start.isoformat()
        stat["last_run"] = now_start.isoformat()
        stat["last_attempt_at"] = now_start.isoformat()

        close_db_on_finish = False
        if db is None:
            db = SessionLocal()
            close_db_on_finish = True

        cb = get_circuit_breaker(source_id)

        try:
            # 1. Circuit Breaker Check (Section 9)
            if not cb.can_execute():
                stat["consecutive_failures"] += 1
                stat["consecutive_successes"] = 0
                stat["freshness_status"] = FreshnessStatus.OFFLINE.value
                stat["last_error"] = f"Circuit breaker is OPEN (failures: {cb.failure_count})"
                logger.warning(f"Scheduler: {source_id} skipped due to open circuit breaker.")
                return {
                    "source_id": source_id,
                    "status": "CIRCUIT_OPEN",
                    "freshness_status": FreshnessStatus.OFFLINE.value,
                    "message": "Circuit breaker is open. Request dropped."
                }

            # 2. Source Access Evaluation (Fail-Closed)
            access_eval = evaluate_source_access(
                source_id,
                enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION,
                allow_official_public=settings.ALLOW_OFFICIAL_PUBLIC_PRODUCTION
            )
            if access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
                stat["consecutive_failures"] += 1
                stat["consecutive_successes"] = 0
                stat["freshness_status"] = FreshnessStatus.OFFLINE.value
                stat["last_error"] = f"Source blocked: {access_eval.current_status}"
                return {
                    "source_id": source_id,
                    "status": "BLOCKED",
                    "freshness_status": FreshnessStatus.OFFLINE.value,
                    "message": f"Source access blocked under production policy: {access_eval.current_status}"
                }

            # 3. Fetch data with bounded retry, exponential backoff and jitter (Section 9)
            records = None
            last_exc = None
            t_fetch_start = time.perf_counter()
            for attempt in range(1, cfg.max_retries + 1):
                try:
                    records = await asyncio.wait_for(cfg.fetcher(), timeout=cfg.timeout_seconds)
                    break
                except asyncio.TimeoutError as te:
                    last_exc = te
                    stat["timeout_count"] += 1
                    logger.warning(f"Scheduler: Timeout (attempt {attempt}/{cfg.max_retries}) for {source_id}")
                    if attempt < cfg.max_retries:
                        jitter = random.uniform(0.1, 0.4)
                        delay = (cfg.backoff_base ** (attempt - 1)) + jitter
                        await asyncio.sleep(delay)
                except Exception as e:
                    last_exc = e
                    logger.warning(f"Scheduler: Attempt {attempt}/{cfg.max_retries} failed for {source_id}: {e}")
                    if attempt < cfg.max_retries:
                        jitter = random.uniform(0.1, 0.4)
                        delay = (cfg.backoff_base ** (attempt - 1)) + jitter
                        await asyncio.sleep(delay)

            t_fetch_end = time.perf_counter()
            stat["ingestion_latency_ms"] = round((t_fetch_end - t_fetch_start) * 1000, 2)

            if records is None:
                cb.record_failure(last_exc or Exception("Fetch failed"), ErrorClassification.NETWORK_ERROR)
                stat["consecutive_failures"] += 1
                stat["consecutive_successes"] = 0
                stat["last_error"] = str(last_exc)
                stat["http_status"] = 503
                stat["freshness_status"] = FreshnessStatus.OFFLINE.value
                return {
                    "source_id": source_id,
                    "status": "FETCH_FAILED",
                    "freshness_status": FreshnessStatus.OFFLINE.value,
                    "error": str(last_exc)
                }

            # Successful fetch -> notify circuit breaker
            cb.record_success()
            t_proc_start = time.perf_counter()
            now_finish = datetime.now(timezone.utc)
            stat["http_status"] = 200
            stat["request_finished_at"] = now_finish.isoformat()
            stat["retrieved_at"] = now_finish.isoformat()
            stat["next_run_at"] = (now_finish + timedelta(seconds=cfg.poll_interval)).isoformat()

            # 4. Ingest, validate and deduplicate records (Section 6, 10, 12, 13)
            stat["records_received_last_run"] = len(records)
            inserted_count = 0
            updated_count = 0
            duplicates_count = 0
            rejected_count = 0
            latest_raw_ts = None
            newest_ts_utc = None
            newest_ts_bkk = None
            affected_stations: List[str] = []

            now_utc = now_finish

            if source_id == "thaiwater_rid_runoff":
                for item in records:
                    st_id = item.get("id")
                    if not st_id:
                        rejected_count += 1
                        stat["parse_error_count"] += 1
                        continue

                    obs_time_str = item.get("observation_time")
                    dt_parsed = None
                    if obs_time_str:
                        try:
                            t_meta = parse_thaiwater_timestamp(obs_time_str)
                            dt_parsed = t_meta["dt_utc"]
                            raw_val = item.get("raw_observation_time") or t_meta["raw"]
                            if newest_ts_utc is None or dt_parsed.isoformat() > newest_ts_utc:
                                newest_ts_utc = dt_parsed.isoformat()
                                newest_ts_bkk = t_meta["normalized_bkk"]
                                latest_raw_ts = raw_val
                        except FutureTimestampError as fe:
                            rejected_count += 1
                            stat["parse_error_count"] += 1
                            logger.warning(f"Scheduler rejected future timestamp for {st_id}: {fe}")
                            continue
                        except Exception as te:
                            stat["parse_error_count"] += 1
                            logger.warning(f"Scheduler timestamp parse error for {st_id}: {te}")

                    # Upsert current state in WaterStation
                    existing_st = db.query(WaterStation).filter(WaterStation.id == st_id).first()
                    wl_val = item.get("water_level_msl")
                    if existing_st:
                        existing_st.water_level_msl = wl_val
                        existing_st.ground_level_msl = item.get("ground_level_msl")
                        existing_st.warning_level_msl = item.get("warning_level_msl")
                        existing_st.critical_level_msl = item.get("critical_level_msl")
                        existing_st.status = item.get("status", "STAGE_RECORDED")
                        existing_st.last_updated = now_utc
                        existing_st.provenance = item.get("provenance", {})
                    else:
                        new_st = WaterStation(
                            id=st_id,
                            name_th=item.get("name_th", ""),
                            name_en=item.get("name_en"),
                            basin=item.get("basin", "ลุ่มน้ำปราจีนบุรี"),
                            district=item.get("district"),
                            latitude=item.get("latitude", 0.0),
                            longitude=item.get("longitude", 0.0),
                            water_level_msl=wl_val,
                            ground_level_msl=item.get("ground_level_msl"),
                            warning_level_msl=item.get("warning_level_msl"),
                            critical_level_msl=item.get("critical_level_msl"),
                            status=item.get("status", "STAGE_RECORDED"),
                            last_updated=now_utc,
                            provenance=item.get("provenance", {})
                        )
                        db.add(new_st)

                    # Time-Series Observation storage & Idempotency / Correction check (Section 6 & 13)
                    if dt_parsed:
                        dup = db.query(WaterLevelObservation).filter(
                            WaterLevelObservation.station_id == st_id,
                            WaterLevelObservation.source_timestamp == dt_parsed
                        ).first()

                        if dup:
                            # Check if upstream corrected a previous measurement (Section 13)
                            is_corrected = False
                            if wl_val is not None and dup.water_level_msl is not None:
                                if abs(dup.water_level_msl - wl_val) > 1e-4:
                                    is_corrected = True
                            elif (wl_val is None) != (dup.water_level_msl is None):
                                is_corrected = True

                            if is_corrected:
                                dup.water_level_msl = wl_val
                                dup.processed_at = now_utc
                                dup.published_at = now_utc
                                dup_prov = dict(dup.provenance or {})
                                dup_prov["corrected_at"] = now_utc.isoformat()
                                dup.provenance = dup_prov
                                updated_count += 1
                                affected_stations.append(st_id)
                            else:
                                duplicates_count += 1
                        else:
                            # Fresh natural observation
                            obs = WaterLevelObservation(
                                id=str(uuid.uuid4()),
                                station_id=st_id,
                                water_level_msl=wl_val,
                                source_timestamp=dt_parsed,
                                observed_at=dt_parsed,
                                retrieved_at=now_utc,
                                ingested_at=now_utc,
                                processed_at=now_utc,
                                published_at=now_utc,
                                source_name="ThaiWater",
                                organization="Hydroinformatics Institute (HII) / RID",
                                dataset="waterlevel_load",
                                record_id=f"tw_wl_{st_id}_{obs_time_str or 'current'}",
                                access_status="OPEN_PUBLIC",
                                license_status="OGL-TH",
                                data_classification="HIGH_FREQUENCY",
                                freshness_status="LIVE",
                                ingestion_mode="EXTERNAL_API",
                                provenance=item.get("provenance", {})
                            )
                            db.add(obs)
                            inserted_count += 1
                            affected_stations.append(st_id)

                db.commit()

            elif source_id == "thaiwater_rainfall":
                for item in records:
                    st_id = item.get("id")
                    if not st_id:
                        rejected_count += 1
                        stat["parse_error_count"] += 1
                        continue

                    obs_time_str = item.get("observation_time")
                    dt_parsed = None
                    if obs_time_str:
                        try:
                            t_meta = parse_thaiwater_timestamp(obs_time_str)
                            dt_parsed = t_meta["dt_utc"]
                            raw_val = item.get("raw_observation_time") or t_meta["raw"]
                            if newest_ts_utc is None or dt_parsed.isoformat() > newest_ts_utc:
                                newest_ts_utc = dt_parsed.isoformat()
                                newest_ts_bkk = t_meta["normalized_bkk"]
                                latest_raw_ts = raw_val
                        except FutureTimestampError as fe:
                            rejected_count += 1
                            stat["parse_error_count"] += 1
                            logger.warning(f"Scheduler rainfall rejected future timestamp for {st_id}: {fe}")
                            continue
                        except Exception as te:
                            stat["parse_error_count"] += 1
                            logger.warning(f"Scheduler rainfall timestamp parse error for {st_id}: {te}")

                    # Upsert current state in RainfallStation
                    existing_rf = db.query(RainfallStation).filter(RainfallStation.id == st_id).first()
                    rain_24_val = item.get("rain_24h_mm")
                    rain_1_val = item.get("rain_1h_mm")
                    if existing_rf:
                        existing_rf.rain_24h_mm = rain_24_val
                        existing_rf.rain_1h_mm = rain_1_val
                        existing_rf.observation_time = obs_time_str
                        existing_rf.status = item.get("status", "RAINFALL_RECORDED")
                        existing_rf.last_updated = now_utc
                        existing_rf.provenance = item.get("provenance", {})
                    else:
                        new_rf = RainfallStation(
                            id=st_id,
                            name_th=item.get("name_th", ""),
                            name_en=item.get("name_en"),
                            basin=item.get("basin", "ลุ่มน้ำบางปะกง"),
                            district=item.get("district"),
                            subdistrict=item.get("subdistrict"),
                            latitude=item.get("latitude", 0.0),
                            longitude=item.get("longitude", 0.0),
                            rain_24h_mm=rain_24_val,
                            rain_1h_mm=rain_1_val,
                            observation_time=obs_time_str,
                            agency=item.get("agency", "สสน."),
                            status=item.get("status", "RAINFALL_RECORDED"),
                            last_updated=now_utc,
                            provenance=item.get("provenance", {})
                        )
                        db.add(new_rf)

                    # Time-Series Observation storage & Idempotency / Correction check (Section 6 & 13)
                    if dt_parsed:
                        dup = db.query(RainfallObservation).filter(
                            RainfallObservation.station_id == st_id,
                            RainfallObservation.source_timestamp == dt_parsed
                        ).first()

                        if dup:
                            # Check if upstream corrected a previous measurement (Section 13)
                            is_corrected = False
                            if rain_24_val is not None and dup.rain_24h_mm is not None:
                                if abs(dup.rain_24h_mm - rain_24_val) > 1e-4:
                                    is_corrected = True
                            elif (rain_24_val is None) != (dup.rain_24h_mm is None):
                                is_corrected = True

                            if is_corrected:
                                dup.rain_24h_mm = rain_24_val
                                dup.rain_1h_mm = rain_1_val
                                dup.processed_at = now_utc
                                dup.published_at = now_utc
                                dup_prov = dict(dup.provenance or {})
                                dup_prov["corrected_at"] = now_utc.isoformat()
                                dup.provenance = dup_prov
                                updated_count += 1
                                affected_stations.append(st_id)
                            else:
                                duplicates_count += 1
                        else:
                            obs = RainfallObservation(
                                id=str(uuid.uuid4()),
                                station_id=st_id,
                                rain_24h_mm=rain_24_val,
                                rain_1h_mm=rain_1_val,
                                source_timestamp=dt_parsed,
                                observed_at=dt_parsed,
                                retrieved_at=now_utc,
                                ingested_at=now_utc,
                                processed_at=now_utc,
                                published_at=now_utc,
                                source_name="ThaiWater",
                                organization="Hydroinformatics Institute (HII) / TMD",
                                dataset="rain_24h",
                                record_id=f"tw_rf_{st_id}_{obs_time_str or 'current'}",
                                access_status="OPEN_PUBLIC",
                                license_status="OGL-TH",
                                data_classification="HIGH_FREQUENCY",
                                freshness_status="LIVE",
                                ingestion_mode="EXTERNAL_API",
                                provenance=item.get("provenance", {})
                            )
                            db.add(obs)
                            inserted_count += 1
                            affected_stations.append(st_id)

                db.commit()

            t_proc_end = time.perf_counter()
            stat["processing_latency_ms"] = round((t_proc_end - t_proc_start) * 1000, 2)
            t1 = time.perf_counter()
            stat["latency_ms"] = round((t1 - t0) * 1000, 2)

            # Freshness evaluation (Section 7 & 38)
            fresh_info = compute_source_freshness(
                newest_ts_utc,
                nominal_interval_seconds=cfg.nominal_interval,
                warning_threshold_seconds=cfg.freshness_warning_threshold,
                stale_threshold_seconds=cfg.freshness_stale_threshold,
                is_source_healthy=True
            )

            stat["records_inserted_last_run"] = inserted_count
            stat["records_updated_last_run"] = updated_count
            stat["duplicates_skipped_last_run"] = duplicates_count
            stat["rejected_last_run"] = rejected_count
            stat["source_timestamp_raw"] = latest_raw_ts
            stat["source_timezone"] = "Asia/Bangkok (UTC+07:00)"
            stat["normalized_timestamp_utc"] = newest_ts_utc
            stat["normalized_timestamp_asia_bangkok"] = newest_ts_bkk
            stat["newest_source_timestamp"] = newest_ts_utc
            stat["latest_source_timestamp"] = newest_ts_bkk
            stat["last_observed_at"] = newest_ts_bkk
            stat["freshness_status"] = fresh_info["status_str"]
            stat["data_age_seconds"] = fresh_info["age_seconds"]

            if newest_ts_utc:
                dt_newest = datetime.fromisoformat(newest_ts_utc)
                stat["source_delay_seconds"] = round(max(0.0, (now_utc - dt_newest).total_seconds()), 1)
            else:
                stat["source_delay_seconds"] = None

            stat["total_successes"] += 1
            stat["consecutive_failures"] = 0
            stat["consecutive_successes"] += 1
            stat["last_success"] = now_utc.isoformat()
            stat["last_error"] = None

            # 5. Incremental Processing Trigger (Section 14 & 15)
            # Invalidate derived spatial monitoring priority cache so fresh telemetry is immediately visible
            if inserted_count > 0 or updated_count > 0:
                try:
                    from apps.api.app.services.spatial_monitoring_service import SpatialMonitoringService
                    SpatialMonitoringService.invalidate_global_cache()
                except Exception as ie:
                    logger.warning(f"Note on spatial cache invalidation: {ie}")

            # 6. Broadcast DATA_UPDATED SSE event (Section 17, 18)
            if inserted_count > 0 or updated_count > 0 or len(records) > 0:
                await event_broadcaster.broadcast_event(
                    "DATA_UPDATED",
                    {
                        "source": source_id,
                        "source_name": cfg.source_name,
                        "dataset": cfg.dataset,
                        "data_type": cfg.data_type,
                        "data_category": cfg.data_category,
                        "area": "ปราจีนบุรี",
                        "records_received": len(records),
                        "records_updated": len(records), # Legacy compatibility
                        "new_observations": inserted_count,
                        "updated_observations": updated_count,
                        "duplicates_skipped": duplicates_count,
                        "affected_stations": list(set(affected_stations))[:20],
                        "observed_at": newest_ts_bkk,
                        "ingested_at": now_utc.isoformat(),
                        "published_at": now_utc.isoformat(),
                        "freshness_status": fresh_info["status_str"],
                        "data_age_seconds": fresh_info["age_seconds"],
                        "latencies": {
                            "ingestion_latency_ms": stat["ingestion_latency_ms"],
                            "processing_latency_ms": stat["processing_latency_ms"],
                            "total_duration_ms": stat["latency_ms"]
                        },
                        "timestamp": now_utc.isoformat(),
                        "version": int(time.time())
                    }
                )

            # 7. Structured Observability Log (Section 27)
            logger.info(
                f"source={source_id} status=success duration_ms={stat['latency_ms']} "
                f"fetched={len(records)} inserted={inserted_count} updated={updated_count} "
                f"duplicates={duplicates_count} newest_observed_at={newest_ts_bkk} "
                f"freshness={fresh_info['status_str']}"
            )

            return {
                "source_id": source_id,
                "status": "SUCCESS",
                "received": len(records),
                "inserted": inserted_count,
                "updated": updated_count,
                "duplicates_skipped": duplicates_count,
                "affected_stations": list(set(affected_stations)),
                "freshness_status": fresh_info["status_str"],
                "data_age_seconds": fresh_info["age_seconds"],
                "source_delay_seconds": stat["source_delay_seconds"],
                "latest_timestamp": newest_ts_bkk,
                "latest_timestamp_utc": newest_ts_utc,
                "latest_timestamp_bkk": newest_ts_bkk
            }

        except Exception as e:
            stat["consecutive_failures"] += 1
            stat["consecutive_successes"] = 0
            stat["last_error"] = str(e)
            stat["freshness_status"] = FreshnessStatus.OFFLINE.value
            logger.error(f"Scheduler error processing {source_id}: {e}", exc_info=True)
            return {
                "source_id": source_id,
                "status": "ERROR",
                "freshness_status": FreshnessStatus.OFFLINE.value,
                "error": str(e)
            }
        finally:
            stat["is_running"] = False
            if close_db_on_finish:
                db.close()

    async def _source_poll_loop(self, source_id: str):
        """Continuous background polling loop for a specific source adhering to source cadence."""
        cfg = self._configs[source_id]
        logger.info(
            f"Scheduler: Starting automated loop for {source_id} "
            f"(poll_interval: {cfg.poll_interval}s, nominal_upstream: {cfg.nominal_interval}s)"
        )
        
        # Initial small delay to let app fully boot
        await asyncio.sleep(5.0)

        while self._running:
            try:
                await self.run_source_now(source_id)
            except asyncio.CancelledError:
                logger.info(f"Scheduler loop for {source_id} cancelled.")
                break
            except Exception as e:
                logger.error(f"Scheduler loop unexpected error for {source_id}: {e}")

            try:
                await asyncio.sleep(cfg.poll_interval)
            except asyncio.CancelledError:
                break

    def start(self):
        """Starts automated background tasks for all eligible sources."""
        if self._running:
            return
        self._running = True
        self._started_at = datetime.now(timezone.utc).isoformat()
        for s_id, cfg in self._configs.items():
            self._stats[s_id]["scheduler_started_at"] = self._started_at
            if cfg.automated_refresh:
                task = asyncio.create_task(self._source_poll_loop(s_id))
                self._tasks.append(task)
        logger.info(f"SourceScheduler started with {len(self._tasks)} automated source loops at {self._started_at}.")

    def stop(self):
        """Gracefully cancels all automated background tasks."""
        self._running = False
        for task in self._tasks:
            if not task.done():
                task.cancel()
        self._tasks.clear()
        logger.info("SourceScheduler stopped.")

# Global singleton
source_scheduler = SourceScheduler()
