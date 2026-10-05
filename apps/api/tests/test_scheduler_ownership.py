import asyncio
from pathlib import Path

from apps.api.app.core.scheduler import SourceScheduler
from scripts.verify_all_sources import classify_scheduler


def test_supported_systemd_unit_has_one_worker():
    unit = Path("deploy/systemd/floodtrace-api.service").read_text()
    assert "--workers 1" in unit
    assert "--workers 2" not in unit


def test_disabled_scheduler_cannot_be_verified():
    assert classify_scheduler({"scheduler_active": False, "sources": {"thaiwater_rid_runoff": {}}}) == "BLOCKED"
    assert classify_scheduler({"scheduler_active": True, "sources": {"thaiwater_rid_runoff": {}}}) == "VERIFIED"
    assert classify_scheduler({"scheduler_active": None, "sources": {}}) == "PARTIAL"


def test_scheduler_start_is_idempotent_and_has_one_loop_per_source(monkeypatch):
    scheduler = SourceScheduler()
    started = []

    async def idle_loop(source_id):
        started.append(source_id)
        await asyncio.Future()

    monkeypatch.setattr(scheduler, "_source_poll_loop", idle_loop)

    async def run():
        scheduler.start()
        scheduler.start()
        await asyncio.sleep(0)
        expected = {key for key, config in scheduler._configs.items() if config.automated_refresh}
        assert len(scheduler._tasks) == len(expected)
        assert len({id(task) for task in scheduler._tasks}) == len(expected)
        assert set(started) == expected
        assert len(started) == len(expected)
        scheduler.stop()
        await asyncio.sleep(0)

    asyncio.run(run())
