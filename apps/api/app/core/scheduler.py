import asyncio
import logging
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Callable
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.core.circuit_breaker import get_circuit_breaker, ErrorClassification
from apps.api.app.core.pipeline import event_broadcaster, ingestion_pipeline
from apps.api.app.core.source_access import evaluate_source_access, IngestionAction
from apps.api.app.models.entities import (
    WaterStation,
    RainfallStation,
    WaterLevelObservation,
    RainfallObservation
)
from apps.api.app.adapters.thaiwater import fetch_thaiwater_stations, fetch_thaiwater_rainfall
from apps.api.app.core.datetime_utils import parse_thaiwater_timestamp, FutureTimestampError, BANGKOK_TZ
import time

logger = logging.getLogger(__name__)

class SourceScheduleConfig:
    def __init__(
        self,
        source_id: str,
        dataset: str,
        interval_seconds: int,
        fetcher: Callable,
        timeout_seconds: float = 20.0,
        max_retries: int = 3,
        automated_refresh: bool = True
    ):
        self.source_id = source_id
        self.dataset = dataset
        self.interval_seconds = interval_seconds
        self.fetcher = fetcher
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.automated_refresh = automated_refresh

class SourceScheduler:
    """
    Automated Background Scheduler for External Telemetry Ingestion (Master Spec Sections 15 & 16).
    
    Features:
    - Source-specific intervals (never polls faster than source supports; no polling of static datasets)
    - Circuit breaker integration (fails closed, handles backoff)
    - Timeout and retry with exponential backoff
    - Deduplication against database and pipeline
    - Time-series observation storage without overwriting historical records (Section 18)
    - Section 22 metadata attribution on every stored record
    - Emits DATA_UPDATED SSE events on successful ingestion
    - Real-time failure and health tracking
    """
    def __init__(self):
        self._configs: Dict[str, SourceScheduleConfig] = {
            "thaiwater_rid_runoff": SourceScheduleConfig(
                source_id="thaiwater_rid_runoff",
                dataset="waterlevel_load",
                interval_seconds=900, # 15 minutes
                fetcher=fetch_thaiwater_stations,
                timeout_seconds=20.0,
                max_retries=3,
                automated_refresh=True
            ),
            "thaiwater_rainfall": SourceScheduleConfig(
                source_id="thaiwater_rainfall",
                dataset="rain_24h",
                interval_seconds=900, # 15 minutes
                fetcher=fetch_thaiwater_rainfall,
                timeout_seconds=20.0,
                max_retries=3,
                automated_refresh=True
            ),
            # Reference datasets are explicitly NOT polled over external networks
            "dwr_waterways": SourceScheduleConfig(
                source_id="dwr_waterways",
                dataset="waterways_geometry",
                interval_seconds=86400 * 30, # Static reference (monthly/static)
                fetcher=lambda: [],
                automated_refresh=False
            ),
            "diw_industrial_waste": SourceScheduleConfig(
                source_id="diw_industrial_waste",
                dataset="waste_processors",
                interval_seconds=86400 * 30, # Historical reference (May 2020)
                fetcher=lambda: [],
                automated_refresh=False
            )
        }
        self._stats: Dict[str, Dict[str, Any]] = {}
        for s_id in self._configs:
            self._stats[s_id] = {
                "source_id": s_id,
                "dataset": self._configs[s_id].dataset,
                "automated_refresh": self._configs[s_id].automated_refresh,
                "interval_seconds": self._configs[s_id].interval_seconds,
                "total_runs": 0,
                "total_successes": 0,
                "consecutive_failures": 0,
                "scheduler_started_at": None,
                "last_run": None,
                "last_success": None,
                "last_error": None,
                "request_started_at": None,
                "request_finished_at": None,
                "http_status": None,
                "latency_ms": None,
                "records_received_last_run": 0,
                "measurements_received_last_run": 0,
                "records_inserted_last_run": 0,
                "duplicates_skipped_last_run": 0,
                "rejected_last_run": 0,
                "source_timestamp_raw": None,
                "source_timezone": "Asia/Bangkok (UTC+07:00)",
                "normalized_timestamp_utc": None,
                "normalized_timestamp_asia_bangkok": None,
                "newest_source_timestamp": None,
                "latest_source_timestamp": None,
                "retrieved_at": None,
                "data_age_seconds": None,
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

        close_db_on_finish = False
        if db is None:
            db = SessionLocal()
            close_db_on_finish = True

        cb = get_circuit_breaker(source_id)

        try:
            # 1. Circuit Breaker Check
            if not cb.can_execute():
                stat["consecutive_failures"] += 1
                stat["last_error"] = f"Circuit breaker is OPEN (failures: {cb.failure_count})"
                logger.warning(f"Scheduler: {source_id} skipped due to open circuit breaker.")
                return {
                    "source_id": source_id,
                    "status": "CIRCUIT_OPEN",
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
                stat["last_error"] = f"Source blocked: {access_eval.current_status}"
                return {
                    "source_id": source_id,
                    "status": "BLOCKED",
                    "message": f"Source access blocked under production policy: {access_eval.current_status}"
                }

            # 3. Fetch data with retry
            records = None
            last_exc = None
            for attempt in range(1, cfg.max_retries + 1):
                try:
                    records = await asyncio.wait_for(cfg.fetcher(), timeout=cfg.timeout_seconds)
                    if not isinstance(records, list):
                        raise ValueError("SOURCE_RESPONSE_SCHEMA_INVALID")
                    break
                except Exception as e:
                    last_exc = e
                    logger.warning("Scheduler: attempt %s failed for %s (%s)", attempt, source_id, type(e).__name__)
                    if attempt < cfg.max_retries:
                        await asyncio.sleep(1.0 * (2 ** (attempt - 1)))

            if records is None:
                cb.record_failure(last_exc or Exception("Fetch failed"), ErrorClassification.NETWORK_ERROR)
                stat["consecutive_failures"] += 1
                stat["last_error"] = type(last_exc).__name__ if last_exc else "FETCH_FAILED"
                stat["request_finished_at"] = datetime.now(timezone.utc).isoformat()
                stat["http_status"] = (
                    last_exc.response.status_code
                    if isinstance(last_exc, httpx.HTTPStatusError)
                    else None
                )
                return {
                    "source_id": source_id,
                    "status": "FETCH_FAILED",
                    "error": stat["last_error"],
                    "http_status": stat["http_status"],
                }

            # Successful fetch -> notify circuit breaker
            cb.record_success()
            t1 = time.perf_counter()
            now_finish = datetime.now(timezone.utc)
            response_status = getattr(records, "http_status", None)
            stat["http_status"] = response_status if isinstance(response_status, int) else None
            stat["latency_ms"] = round((t1 - t0) * 1000, 2)
            stat["request_finished_at"] = now_finish.isoformat()
            stat["retrieved_at"] = now_finish.isoformat()
            stat["next_run_at"] = (now_finish + timedelta(seconds=cfg.interval_seconds)).isoformat()

            # 4. Ingest and deduplicate records
            stat["records_received_last_run"] = len(records)
            stat["measurements_received_last_run"] = 0
            inserted_count = 0
            duplicates_count = 0
            rejected_count = 0
            latest_raw_ts = None
            newest_ts_utc = None
            newest_ts_bkk = None

            now_utc = now_finish

            if source_id == "thaiwater_rid_runoff":
                for item in records:
                    st_id = item.get("id")
                    if not st_id:
                        rejected_count += 1
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
                            logger.warning(f"Scheduler rejected future timestamp for {st_id}: {fe}")
                            continue
                        except Exception as te:
                            logger.warning(f"Scheduler timestamp parse error for {st_id}: {te}")
                    if dt_parsed is None:
                        rejected_count += 1
                        continue
                    if item.get("water_level_msl") is not None:
                        stat["measurements_received_last_run"] += 1

                    # Upsert current state in WaterStation
                    existing_st = db.query(WaterStation).filter(WaterStation.id == st_id).first()
                    if existing_st:
                        existing_st.water_level_msl = item.get("water_level_msl")
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
                            basin=item.get("basin") or "",
                            district=item.get("district"),
                            latitude=item.get("latitude", 0.0),
                            longitude=item.get("longitude", 0.0),
                            water_level_msl=item.get("water_level_msl"),
                            ground_level_msl=item.get("ground_level_msl"),
                            warning_level_msl=item.get("warning_level_msl"),
                            critical_level_msl=item.get("critical_level_msl"),
                            status=item.get("status", "STAGE_RECORDED"),
                            last_updated=now_utc,
                            provenance=item.get("provenance", {})
                        )
                        db.add(new_st)

                    # Time-Series Observation storage (Section 18 & 22)
                    # Check for duplicates on (station_id, source_timestamp)
                    is_dup = False
                    if dt_parsed:
                        dup = db.query(WaterLevelObservation).filter(
                            WaterLevelObservation.station_id == st_id,
                            WaterLevelObservation.source_timestamp == dt_parsed
                        ).first()
                        if dup:
                            is_dup = True

                    if is_dup:
                        duplicates_count += 1
                    else:
                        obs = WaterLevelObservation(
                            id=str(uuid.uuid4()),
                            station_id=st_id,
                            water_level_msl=item.get("water_level_msl"),
                            source_timestamp=dt_parsed,
                            retrieved_at=now_utc,
                            source_name="ThaiWater",
                            organization="Hydro-Informatics Institute (HII)",
                            dataset="waterlevel_load",
                            record_id=f"tw_wl_{st_id}_{obs_time_str or 'current'}",
                            access_status="OPEN_PUBLIC",
                            license_status="OGL-TH",
                            data_classification="HIGH_FREQUENCY",
                            freshness_status="FRESH",
                            ingestion_mode="EXTERNAL_API",
                            provenance=item.get("provenance", {})
                        )
                        db.add(obs)
                        inserted_count += 1

                db.commit()

            elif source_id == "thaiwater_rainfall":
                for item in records:
                    st_id = item.get("id")
                    if not st_id:
                        rejected_count += 1
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
                            logger.warning(f"Scheduler rainfall rejected future timestamp for {st_id}: {fe}")
                            continue
                        except Exception as te:
                            logger.warning(f"Scheduler rainfall timestamp parse error for {st_id}: {te}")
                    if dt_parsed is None:
                        rejected_count += 1
                        continue
                    if item.get("rain_24h_mm") is not None or item.get("rain_1h_mm") is not None:
                        stat["measurements_received_last_run"] += 1

                    # Upsert current state in RainfallStation
                    existing_rf = db.query(RainfallStation).filter(RainfallStation.id == st_id).first()
                    if existing_rf:
                        existing_rf.rain_24h_mm = item.get("rain_24h_mm")
                        existing_rf.rain_1h_mm = item.get("rain_1h_mm")
                        existing_rf.observation_time = obs_time_str
                        existing_rf.status = item.get("status", "RAINFALL_RECORDED")
                        existing_rf.last_updated = now_utc
                        existing_rf.provenance = item.get("provenance", {})
                    else:
                        new_rf = RainfallStation(
                            id=st_id,
                            name_th=item.get("name_th", ""),
                            name_en=item.get("name_en"),
                            basin=item.get("basin"),
                            district=item.get("district"),
                            subdistrict=item.get("subdistrict"),
                            latitude=item.get("latitude", 0.0),
                            longitude=item.get("longitude", 0.0),
                            rain_24h_mm=item.get("rain_24h_mm"),
                            rain_1h_mm=item.get("rain_1h_mm"),
                            observation_time=obs_time_str,
                            agency=item.get("agency", "สสน."),
                            status=item.get("status", "RAINFALL_RECORDED"),
                            last_updated=now_utc,
                            provenance=item.get("provenance", {})
                        )
                        db.add(new_rf)

                    # Time-Series Observation storage (Section 18 & 22)
                    is_dup = False
                    if dt_parsed:
                        dup = db.query(RainfallObservation).filter(
                            RainfallObservation.station_id == st_id,
                            RainfallObservation.source_timestamp == dt_parsed
                        ).first()
                        if dup:
                            is_dup = True

                    if is_dup:
                        duplicates_count += 1
                    else:
                        obs = RainfallObservation(
                            id=str(uuid.uuid4()),
                            station_id=st_id,
                            rain_24h_mm=item.get("rain_24h_mm"),
                            rain_1h_mm=item.get("rain_1h_mm"),
                            source_timestamp=dt_parsed,
                            retrieved_at=now_utc,
                            source_name="ThaiWater",
                            organization="Hydro-Informatics Institute (HII)",
                            dataset="rain_24h",
                            record_id=f"tw_rf_{st_id}_{obs_time_str or 'current'}",
                            access_status="OPEN_PUBLIC",
                            license_status="OGL-TH",
                            data_classification="HIGH_FREQUENCY",
                            freshness_status="FRESH",
                            ingestion_mode="EXTERNAL_API",
                            provenance=item.get("provenance", {})
                        )
                        db.add(obs)
                        inserted_count += 1

                db.commit()

            stat["records_inserted_last_run"] = inserted_count
            stat["duplicates_skipped_last_run"] = duplicates_count
            stat["rejected_last_run"] = rejected_count
            stat["source_timestamp_raw"] = latest_raw_ts
            stat["source_timezone"] = "Asia/Bangkok (UTC+07:00)"
            stat["normalized_timestamp_utc"] = newest_ts_utc
            stat["normalized_timestamp_asia_bangkok"] = newest_ts_bkk
            stat["newest_source_timestamp"] = newest_ts_utc
            stat["latest_source_timestamp"] = newest_ts_bkk
            if newest_ts_utc:
                dt_newest = datetime.fromisoformat(newest_ts_utc)
                stat["data_age_seconds"] = round((now_utc - dt_newest).total_seconds(), 2)
            else:
                stat["data_age_seconds"] = None
            stat["total_successes"] += 1
            stat["consecutive_failures"] = 0
            stat["last_success"] = now_utc.isoformat()
            stat["last_error"] = None

            # 5. Broadcast DATA_UPDATED SSE event (Section 17)
            if inserted_count > 0 or len(records) > 0:
                await event_broadcaster.broadcast_event(
                    "DATA_UPDATED",
                    {
                        "source": source_id,
                        "dataset": cfg.dataset,
                        "area": "ปราจีนบุรี",
                        "records_updated": len(records),
                        "new_observations": inserted_count,
                        "duplicates_skipped": duplicates_count,
                        "timestamp": now_utc.isoformat()
                    }
                )

            logger.info(
                f"Scheduler: Successfully refreshed {source_id}: "
                f"{len(records)} received, {inserted_count} new observations, "
                f"{duplicates_count} duplicates skipped."
            )

            return {
                "source_id": source_id,
                "status": "SUCCESS",
                "received": len(records),
                "inserted": inserted_count,
                "duplicates_skipped": duplicates_count,
                "latest_timestamp": newest_ts_bkk,
                "latest_timestamp_utc": newest_ts_utc,
                "latest_timestamp_bkk": newest_ts_bkk
            }

        except Exception as e:
            stat["consecutive_failures"] += 1
            stat["last_error"] = type(e).__name__
            stat["request_finished_at"] = datetime.now(timezone.utc).isoformat()
            logger.error("Scheduler error processing %s (%s)", source_id, type(e).__name__)
            return {
                "source_id": source_id,
                "status": "ERROR",
                "error": stat["last_error"]
            }
        finally:
            stat["is_running"] = False
            if close_db_on_finish:
                db.close()

    async def _source_poll_loop(self, source_id: str):
        """Continuous background polling loop for a specific source."""
        cfg = self._configs[source_id]
        logger.info(f"Scheduler: Starting automated loop for {source_id} (interval: {cfg.interval_seconds}s)")
        
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
                await asyncio.sleep(cfg.interval_seconds)
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
