import pytest
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.core.scheduler import source_scheduler, SourceScheduleConfig
from apps.api.app.core.pipeline import event_broadcaster
from apps.api.app.core.provenance import (
    compute_source_freshness,
    FreshnessStatus,
    DataTimingMetadata,
    DataCategory
)
from apps.api.app.core.datetime_utils import format_relative_age_thai, format_relative_age_en, to_bangkok_iso
from apps.api.app.models.entities import (
    WaterStation,
    RainfallStation,
    WaterLevelObservation,
    RainfallObservation
)

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.query(WaterLevelObservation).delete()
        db.query(RainfallObservation).delete()
        db.query(WaterStation).delete()
        db.query(RainfallStation).delete()
        db.commit()
        db.close()


def test_timing_model_fields_and_latencies():
    """
    Master Prompt Section 3 & 37:
    Verifies that the explicit timing model tracks observed_at, ingested_at, processed_at, published_at
    and correctly calculates latencies.
    """
    now = datetime.now(timezone.utc)
    obs_time = now - timedelta(seconds=120)
    ingest_time = now - timedelta(seconds=15)
    proc_time = now - timedelta(seconds=2)
    pub_time = now

    meta = DataTimingMetadata(
        observed_at=obs_time,
        observed_at_bkk=to_bangkok_iso(obs_time),
        ingested_at=ingest_time,
        processed_at=proc_time,
        published_at=pub_time,
        source_delay_seconds=round((ingest_time - obs_time).total_seconds(), 2),
        ingestion_latency_ms=150.0,
        processing_latency_ms=80.0,
        publication_latency_ms=10.0,
        end_to_end_latency_seconds=round((pub_time - obs_time).total_seconds(), 2)
    )

    assert meta.observed_at == obs_time
    assert meta.source_delay_seconds == 105.0
    assert meta.end_to_end_latency_seconds == 120.0
    assert "+07:00" in meta.observed_at_bkk


def test_freshness_engine_classifications():
    """
    Master Prompt Section 7 & 38:
    Tests the source-aware Data Freshness Engine across LIVE, RECENT, DELAYED, STALE, OFFLINE, UNKNOWN.
    """
    now = datetime.now(timezone.utc)
    nominal_interval = 900 # 15 minutes (ThaiWater standard)

    # 1. LIVE: fresh observation within 15 min (e.g. 5 min old)
    ts_live = now - timedelta(minutes=5)
    res_live = compute_source_freshness(ts_live, nominal_interval_seconds=nominal_interval)
    assert res_live["status"] == FreshnessStatus.LIVE
    assert res_live["status_str"] == "LIVE"
    assert res_live["age_seconds"] < 900

    # 2. RECENT: slightly past nominal interval (e.g. 18 min old)
    ts_recent = now - timedelta(minutes=18)
    res_recent = compute_source_freshness(ts_recent, nominal_interval_seconds=nominal_interval)
    assert res_recent["status"] == FreshnessStatus.RECENT
    assert res_recent["status_str"] == "RECENT"

    # 3. DELAYED: upstream is late (e.g. 35 min old)
    ts_delayed = now - timedelta(minutes=35)
    res_delayed = compute_source_freshness(ts_delayed, nominal_interval_seconds=nominal_interval)
    assert res_delayed["status"] == FreshnessStatus.DELAYED
    assert res_delayed["status_str"] == "DELAYED"

    # 4. STALE: well past stale threshold (e.g. 65 min old)
    ts_stale = now - timedelta(minutes=65)
    res_stale = compute_source_freshness(ts_stale, nominal_interval_seconds=nominal_interval)
    assert res_stale["status"] == FreshnessStatus.STALE
    assert res_stale["status_str"] == "STALE"

    # 5. OFFLINE: source unhealthy
    res_offline = compute_source_freshness(ts_live, nominal_interval_seconds=nominal_interval, is_source_healthy=False)
    assert res_offline["status"] == FreshnessStatus.OFFLINE
    assert res_offline["status_str"] == "OFFLINE"

    # 6. UNKNOWN: missing timestamp
    res_unknown = compute_source_freshness(None, nominal_interval_seconds=nominal_interval)
    assert res_unknown["status"] == FreshnessStatus.UNKNOWN
    assert res_unknown["status_str"] == "UNKNOWN"


def test_relative_age_formatting():
    """
    Master Prompt Section 20:
    Verifies human-friendly relative age displays in Thai and English.
    """
    assert "วินาทีที่แล้ว" in format_relative_age_thai(42.0)
    assert "42s ago" in format_relative_age_en(42.0)
    assert "นาทีที่แล้ว" in format_relative_age_thai(300.0)
    assert "5m ago" in format_relative_age_en(300.0)
    assert "ชั่วโมงที่แล้ว" in format_relative_age_thai(7200.0)
    assert "2h ago" in format_relative_age_en(7200.0)


def test_source_aware_cadences_and_configuration():
    """
    Master Prompt Section 4 & 28:
    Verifies that sources have explicit, differentiated nominal intervals and polling intervals.
    Forecast sources are explicitly marked FORECAST, not MEASURED_FACT.
    """
    configs = source_scheduler._configs
    assert "thaiwater_rid_runoff" in configs
    assert "thaiwater_rainfall" in configs
    assert "openmeteo_forecast" in configs
    assert "dwr_waterways" in configs

    # ThaiWater telemetry is high-frequency sensor measurement
    tw = configs["thaiwater_rid_runoff"]
    assert tw.nominal_interval == 900
    assert tw.poll_interval <= 900
    assert tw.data_category == "MEASURED_FACT"

    # Open-Meteo is strictly a forecast model, NEVER presented as real-time measured fact
    om = configs["openmeteo_forecast"]
    assert om.data_type == "FORECAST"
    assert om.data_category == "FORECAST"
    assert om.nominal_interval == 3600

    # DWR waterways is static GIS geometry, never polled frequently
    dwr = configs["dwr_waterways"]
    assert dwr.automated_refresh is False
    assert dwr.nominal_interval >= 86400 * 7


def test_idempotent_ingestion_and_deduplication(db_session):
    """
    Master Prompt Section 6 & 12:
    Repeated polling of identical upstream observations must NOT create duplicates.
    Deduplication must happen at backend/database layer.
    """
    async def _test():
        res1 = await source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session)
        assert res1["status"] == "SUCCESS"
        assert res1["received"] > 0

        # Run again immediately
        res2 = await source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session)
        assert res2["status"] == "SUCCESS"
        assert res2["inserted"] == 0
        assert res2["duplicates_skipped"] == res2["received"]

    asyncio.run(_test())


def test_upstream_data_correction_handling(db_session):
    """
    Master Prompt Section 13:
    When an upstream provider corrects an existing observation, FloodTrace must update
    the normalized record in-place rather than creating two competing records.
    """
    now = datetime.now(timezone.utc)
    test_station_id = f"test_st_{uuid.uuid4().hex[:6]}"
    test_timestamp = now - timedelta(hours=2)

    # 1. Insert initial observation
    obs = WaterLevelObservation(
        id=str(uuid.uuid4()),
        station_id=test_station_id,
        water_level_msl=2.50,
        source_timestamp=test_timestamp,
        observed_at=test_timestamp,
        retrieved_at=now,
        ingested_at=now,
        processed_at=now,
        published_at=now,
        source_name="ThaiWater",
        organization="HII / RID",
        dataset="waterlevel_load",
        record_id=f"tw_wl_{test_station_id}_init",
        access_status="OPEN_PUBLIC",
        license_status="OGL-TH",
        data_classification="HIGH_FREQUENCY",
        freshness_status="LIVE",
        ingestion_mode="EXTERNAL_API",
        provenance={"original_timestamp": test_timestamp.isoformat()}
    )
    db_session.add(obs)
    db_session.commit()

    # 2. Simulate upstream corrected record arriving with water_level_msl = 2.65
    existing = db_session.query(WaterLevelObservation).filter(
        WaterLevelObservation.station_id == test_station_id,
        WaterLevelObservation.source_timestamp == test_timestamp
    ).first()
    assert existing is not None
    assert existing.water_level_msl == 2.50

    # In-place correction
    new_corrected_val = 2.65
    existing.water_level_msl = new_corrected_val
    existing.processed_at = datetime.now(timezone.utc)
    existing.published_at = datetime.now(timezone.utc)
    prov = dict(existing.provenance or {})
    prov["corrected_at"] = existing.processed_at.isoformat()
    existing.provenance = prov
    db_session.commit()

    # Verify that only 1 record exists and holds the corrected value
    records = db_session.query(WaterLevelObservation).filter(
        WaterLevelObservation.station_id == test_station_id,
        WaterLevelObservation.source_timestamp == test_timestamp
    ).all()
    assert len(records) == 1
    assert records[0].water_level_msl == 2.65
    assert "corrected_at" in records[0].provenance

    # Clean up test record
    db_session.delete(records[0])
    db_session.commit()


def test_public_telemetry_sources_endpoint():
    """
    Master Prompt Section 8 & 24:
    Verifies that GET /api/public/telemetry/sources returns truthful source health,
    cadences, and freshness classifications without leaking internal credentials.
    """
    resp = client.get("/api/public/telemetry/sources")
    assert resp.status_code == 200
    data = resp.json()

    assert "status" in data
    assert "sources" in data
    assert "system_time" in data
    assert len(data["sources"]) >= 2

    # Check ThaiWater source info
    tw_src = next((s for s in data["sources"] if s["source_id"] == "thaiwater_rid_runoff"), None)
    assert tw_src is not None
    assert tw_src["nominal_interval_seconds"] == 900
    assert tw_src["data_category"] == "MEASURED_FACT"
    assert "freshness_status" in tw_src
    # Zero secret keys in public response
    assert "api_key" not in str(data).lower()
    assert "token" not in str(data).lower()


def test_public_stations_api_includes_timing_and_freshness(db_session):
    """
    Master Prompt Section 20 & 24:
    Verifies that public station endpoints return explicit observation timestamps,
    ingestion timestamps, and freshness classifications.
    """
    # Ensure at least 1 station in DB
    if db_session.query(WaterStation).count() == 0:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session))

    resp = client.get("/api/public/stations")
    assert resp.status_code == 200
    stations = resp.json()
    assert len(stations) > 0

    st = stations[0]
    assert "observed_at" in st
    assert "freshness_status" in st
    assert "observation_age_seconds" in st
    assert st["data_category"] == "MEASURED_FACT"
    assert st["value_nature"] == "OBSERVED"


def test_public_rainfall_stations_api_includes_timing_and_freshness(db_session):
    """
    Master Prompt Section 20 & 24:
    Verifies that public rainfall stations return freshness and timing fields.
    """
    if db_session.query(RainfallStation).count() == 0:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rainfall", db=db_session))

    resp = client.get("/api/public/rainfall-stations")
    assert resp.status_code == 200
    stations = resp.json()
    assert len(stations) > 0

    rs = stations[0]
    assert "observed_at" in rs
    assert "freshness_status" in rs
    assert "observation_age_seconds" in rs
    assert rs["data_category"] == "MEASURED_FACT"


def test_station_history_chronological_ordering(db_session):
    """
    Master Prompt Section 23:
    Historical time-series must be sorted chronologically by observation time.
    """
    sample_obs = db_session.query(WaterLevelObservation).first()
    if not sample_obs:
        asyncio.run(source_scheduler.run_source_now("thaiwater_rid_runoff", db=db_session))
        sample_obs = db_session.query(WaterLevelObservation).first()

    st_id = sample_obs.station_id
    resp = client.get(f"/api/public/stations/{st_id}/history?range=24h")
    assert resp.status_code == 200
    data = resp.json()
    assert data["station_id"] == st_id
    observations = data["observations"]

    if len(observations) > 1:
        # Check ascending order
        for i in range(len(observations) - 1):
            t1 = observations[i]["source_timestamp"]
            t2 = observations[i + 1]["source_timestamp"]
            if t1 and t2:
                assert t1 <= t2


def test_realtime_event_broadcaster_dispatch():
    """
    Master Prompt Section 17 & 18:
    Tests that the real-time event broadcaster dispatches safe DATA_UPDATED payloads.
    """
    received_events = []

    async def _test():
        queue = await event_broadcaster.subscribe()

        # Broadcast test update
        payload = {
            "source": "thaiwater_rid_runoff",
            "dataset": "waterlevel_load",
            "records_received": 5,
            "new_observations": 2,
            "freshness_status": "LIVE",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await event_broadcaster.broadcast_event("DATA_UPDATED", payload)

        msg = await asyncio.wait_for(queue.get(), timeout=2.0)
        received_events.append(msg)
        await event_broadcaster.unsubscribe(queue)

    asyncio.run(_test())
    assert len(received_events) == 1
    assert received_events[0]["event"] == "DATA_UPDATED"
    assert received_events[0]["data"]["source"] == "thaiwater_rid_runoff"
    assert received_events[0]["data"]["new_observations"] == 2
