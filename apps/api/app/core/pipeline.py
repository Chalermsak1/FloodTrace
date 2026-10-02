import asyncio
import logging
import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Set, List
from pydantic import BaseModel, Field

from apps.api.app.core.config import settings
from apps.api.app.core.source_access import (
    evaluate_source_access,
    IngestionAction,
    AccessAuthorizationStatus,
    CANDIDATE_SOURCES_REGISTRY
)
from apps.api.app.core.provenance import (
    make_provenance,
    DataCategory,
    SourceVerification,
    ValueNature,
    FreshnessStatus,
    compute_freshness
)
from apps.api.app.core.circuit_breaker import get_circuit_breaker, ErrorClassification

logger = logging.getLogger(__name__)

# ============================================================
# Section 20: Real-Time Event Broadcaster (SSE)
# ============================================================
class RealtimeEventBroadcaster:
    """
    Manages active SSE client subscriber queues.
    Dispatches safe metadata-only event payloads to connected frontends.
    """
    def __init__(self):
        self._subscribers: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers.append(q)
        logger.info(f"SSE Client subscribed. Active clients: {len(self._subscribers)}")
        return q

    async def unsubscribe(self, q: asyncio.Queue):
        async with self._lock:
            if q in self._subscribers:
                self._subscribers.remove(q)
        logger.info(f"SSE Client disconnected. Remaining clients: {len(self._subscribers)}")

    async def broadcast_event(self, event_type: str, payload: Dict[str, Any]):
        """
        Dispatches safe event payload to all connected subscribers.
        Zero credentials, zero PII.
        """
        message = {
            "event": event_type,
            "data": payload,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        async with self._lock:
            for q in list(self._subscribers):
                try:
                    q.put_nowait(message)
                except asyncio.QueueFull:
                    # Drop slow consumer
                    try:
                        self._subscribers.remove(q)
                    except ValueError:
                        pass

event_broadcaster = RealtimeEventBroadcaster()


# ============================================================
# Section 13, 14, 15, 18: Ingestion Pipeline Models & Queue
# ============================================================
class IngestionTask(BaseModel):
    task_id: str = Field(default_factory=lambda: f"tsk_{uuid.uuid4().hex[:8]}")
    source_id: str
    dataset_id: str
    station_id: Optional[str] = None
    observation_time: Optional[str] = None
    payload: Dict[str, Any]
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    retry_count: int = 0

class IngestionResult(BaseModel):
    task_id: str
    source_id: str
    status: str # SUCCESS, DEDUPLICATED, BLOCKED, VALIDATION_FAILED, ERROR
    message: str
    deduplication_key: Optional[str] = None
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DataIngestionPipeline:
    """
    Automated Data Pipeline (Master Prompt Section 13):
    Source -> Scheduler -> Queue -> Worker -> Adapter -> Validation
           -> Normalization -> Provenance -> Deduplication -> Database
           -> Health Status -> Event -> Frontend

    Non-blocking async queue prevents public API degradation during ingestion.
    """
    def __init__(self, max_queue_size: int = 1000):
        self._queue: asyncio.Queue[IngestionTask] = asyncio.Queue(maxsize=max_queue_size)
        self._processed_keys: Set[str] = set()
        self._processed_count: int = 0
        self._deduplicated_count: int = 0
        self._blocked_count: int = 0
        self._failed_count: int = 0
        self._worker_task: Optional[asyncio.Task] = None
        self._source_last_fetch: Dict[str, Dict[str, Any]] = {}

    def get_stats(self) -> Dict[str, Any]:
        return {
            "queue_depth": self._queue.qsize(),
            "tasks_processed": self._processed_count,
            "tasks_deduplicated": self._deduplicated_count,
            "tasks_blocked": self._blocked_count,
            "tasks_failed": self._failed_count,
            "sources_tracked": len(self._source_last_fetch),
            "sources_health": self._source_last_fetch
        }

    async def enqueue_task(self, task: IngestionTask) -> bool:
        """Enqueues task into the async pipeline queue without blocking caller."""
        try:
            self._queue.put_nowait(task)
            return True
        except asyncio.QueueFull:
            logger.error("Ingestion pipeline queue is FULL. Discarding ingestion task.")
            self._failed_count += 1
            return False

    def validate_payload(self, source_id: str, payload: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Section 15 Ingestion Validation:
        Validates schema, types, units, timestamps, coordinates, valid ranges.
        Rejects invalid data; never silently repairs suspicious values.
        """
        if not isinstance(payload, dict) or not payload:
            return False, "Payload must be a non-empty dictionary"

        # Coordinates check if present
        lat = payload.get("latitude")
        lon = payload.get("longitude")
        if lat is not None and lon is not None:
            try:
                lat_f = float(lat)
                lon_f = float(lon)
                # Prachin Buri bounding polygon range: Lat 13.5 - 14.5, Lon 101.0 - 102.3
                if not (13.50 <= lat_f <= 14.50 and 101.00 <= lon_f <= 102.30):
                    return False, f"Coordinates ({lat_f}, {lon_f}) are outside Prachin Buri boundary"
            except (ValueError, TypeError):
                return False, f"Invalid latitude/longitude types: {lat}, {lon}"

        # Numeric range validations for water parameters
        if "water_depth_cm" in payload:
            try:
                depth = float(payload["water_depth_cm"])
                if depth < 0 or depth > 2000:
                    return False, f"water_depth_cm out of physical range: {depth}"
            except (ValueError, TypeError):
                return False, "water_depth_cm must be numeric"

        if "water_level_msl" in payload and payload["water_level_msl"] is not None:
            try:
                wl = float(payload["water_level_msl"])
                if wl < -100 or wl > 500:
                    return False, f"water_level_msl out of physical range: {wl}"
            except (ValueError, TypeError):
                return False, "water_level_msl must be numeric"

        # Timestamp validation (reject timestamps in far future > 24 hours)
        obs_time = payload.get("observation_time")
        if obs_time:
            try:
                if isinstance(obs_time, str):
                    t = datetime.fromisoformat(obs_time.replace("Z", "+00:00"))
                elif isinstance(obs_time, datetime):
                    t = obs_time
                else:
                    t = None
                
                if t:
                    if t.tzinfo is None:
                        t = t.replace(tzinfo=timezone.utc)
                    delta_future = (t - datetime.now(timezone.utc)).total_seconds()
                    if delta_future > 86400:
                        return False, f"Observation timestamp is in the future (> 24h): {obs_time}"
            except Exception as e:
                return False, f"Invalid observation_time format: {obs_time} ({e})"

        return True, None

    def compute_deduplication_key(self, task: IngestionTask) -> str:
        """
        Section 18 Deduplication:
        Composite identity: source + dataset + station_id + observation_time
        Prevents duplicate records from being stored repeatedly.
        """
        station = task.station_id or task.payload.get("station_id") or task.payload.get("id") or "default"
        obs_time = task.observation_time or task.payload.get("observation_time") or task.payload.get("source_timestamp") or "instant"
        return f"{task.source_id}:{task.dataset_id}:{station}:{obs_time}"

    async def process_task(self, task: IngestionTask) -> IngestionResult:
        """
        Executes single pipeline ingestion task following fail-closed governance.
        """
        source_id = task.source_id
        
        # 1. Source Access Authorization Verification (Section 2 & 10)
        access_eval = evaluate_source_access(
            source_id,
            enforce_private_production=settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION
        )
        
        is_production = settings.DATA_ENV == "PRODUCTION" or settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION
        if is_production and access_eval.ingestion_action == IngestionAction.BLOCK_PRODUCTION_INGESTION:
            self._blocked_count += 1
            self._record_health(source_id, status="BLOCKED_PRODUCTION_ACCESS_REQUIRED", error=access_eval.current_status)
            logger.warning(f"Pipeline: Blocked ingestion for {source_id}: {access_eval.current_status}")
            return IngestionResult(
                task_id=task.task_id,
                source_id=source_id,
                status="BLOCKED",
                message="Source blocked from production under REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True"
            )

        # 2. Ingestion Validation (Section 15)
        is_valid, err = self.validate_payload(source_id, task.payload)
        if not is_valid:
            self._failed_count += 1
            self._record_health(source_id, status="VALIDATION_FAILED", error=err)
            logger.error(f"Pipeline: Validation failed for task {task.task_id} ({source_id}): {err}")
            return IngestionResult(
                task_id=task.task_id,
                source_id=source_id,
                status="VALIDATION_FAILED",
                message=err or "Validation check failed"
            )

        # 3. Deduplication (Section 18)
        dedup_key = self.compute_deduplication_key(task)
        if dedup_key in self._processed_keys:
            self._deduplicated_count += 1
            logger.info(f"Pipeline: Deduplicated record {dedup_key}. Skipping duplicate store.")
            return IngestionResult(
                task_id=task.task_id,
                source_id=source_id,
                status="DEDUPLICATED",
                message="Duplicate record ignored",
                deduplication_key=dedup_key
            )

        # 4. Success Processing
        self._processed_keys.add(dedup_key)
        # Limit memory set size to last 50,000 keys
        if len(self._processed_keys) > 50000:
            self._processed_keys.clear()
            self._processed_keys.add(dedup_key)

        self._processed_count += 1
        self._record_health(source_id, status="HEALTHY", error=None)

        # 5. Broadcast DATA_UPDATED SSE event (Section 20)
        safe_event_payload = {
            "source": source_id,
            "dataset": task.dataset_id,
            "area": task.payload.get("district", "ปราจีนบุรี"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await event_broadcaster.broadcast_event("DATA_UPDATED", safe_event_payload)

        return IngestionResult(
            task_id=task.task_id,
            source_id=source_id,
            status="SUCCESS",
            message="Data validated, deduplicated, and ingested successfully",
            deduplication_key=dedup_key
        )

    def _record_health(self, source_id: str, status: str, error: Optional[str] = None):
        self._source_last_fetch[source_id] = {
            "status": status,
            "last_attempt": datetime.now(timezone.utc).isoformat(),
            "last_error": error,
            "circuit_breaker": get_circuit_breaker(source_id).get_status()
        }

    async def _worker_loop(self):
        """Background pipeline consumer worker loop."""
        logger.info("Ingestion pipeline worker started.")
        while True:
            try:
                task = await self._queue.get()
                await self.process_task(task)
                self._queue.task_done()
            except asyncio.CancelledError:
                logger.info("Ingestion pipeline worker cancelled.")
                break
            except Exception as e:
                logger.error(f"Unexpected error in pipeline worker: {e}", exc_info=True)
                await asyncio.sleep(0.5)

    def start_worker(self):
        """Starts background worker if not already running."""
        if self._worker_task is None or self._worker_task.done():
            self._worker_task = asyncio.create_task(self._worker_loop())

    def stop_worker(self):
        if self._worker_task and not self._worker_task.done():
            self._worker_task.cancel()

# Global singleton pipeline
ingestion_pipeline = DataIngestionPipeline()
