from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from apps.api.app.core import staff_rbac
from apps.api.app.core.config import settings
from apps.api.app.core.database import get_db
from apps.api.app.main import app
from apps.api.app.models.entities import Reservoir, StaffUser, WaterStation


client = TestClient(app)


class _Query:
    def __init__(self, db, model):
        self.db = db
        self.model = model

    def filter(self, _condition):
        return self

    def all(self):
        if self.model is StaffUser:
            return [SimpleNamespace(
                id="staff_admin_01", username="admin_user", role="ADMIN", is_active=True,
                display_name="Resolved administrator", department="Test", email="admin@example.invalid",
            )]
        if self.model in (WaterStation, Reservoir):
            return []
        raise AssertionError(f"Unexpected query model: {self.model}")

    def delete(self):
        self.db.writes.append(("delete", self.model))
        return 0


class _Db:
    def __init__(self):
        self.writes = []
        self.queries = []

    def query(self, model):
        self.queries.append(model)
        return _Query(self, model)

    def merge(self, record):
        self.writes.append(("merge", record))

    def commit(self):
        self.writes.append(("commit", None))


@pytest.fixture
def isolated_db():
    db = _Db()
    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield db
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous


def _auth_headers():
    return {"X-Admin-Key": settings.ADMIN_API_KEY}


def test_governance_mode_get_is_read_only_and_non_sensitive(isolated_db):
    response = client.get("/api/v1/governance/mode")

    assert response.status_code == 200
    assert set(response.json()) == {"mode"}
    assert response.json()["mode"] in {"DEVELOPMENT", "PRODUCTION"}
    assert isolated_db.queries == []
    assert isolated_db.writes == []


@pytest.mark.parametrize("headers", [{}, {"X-Admin-Key": "invalid"}])
def test_governance_mode_denial_has_no_side_effects(monkeypatch, isolated_db, headers):
    import apps.api.app.adapters.diw as diw
    import apps.api.app.adapters.rid as rid
    import apps.api.app.adapters.thaiwater as thaiwater

    calls = []
    monkeypatch.setattr(diw, "load_diw_facilities", lambda: calls.append("diw") or [])
    async def fetch_stations():
        calls.append("thaiwater")
        return []
    monkeypatch.setattr(thaiwater, "fetch_thaiwater_stations", fetch_stations)
    async def fetch_reservoirs():
        calls.append("rid")
        return []
    monkeypatch.setattr(rid, "fetch_rid_reservoirs", fetch_reservoirs)
    original = (settings.DATA_ENV, settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION)

    response = client.post("/api/v1/governance/mode", headers=headers, json={"mode": "DEVELOPMENT"})

    assert response.status_code == 401
    assert calls == []
    assert isolated_db.writes == []
    assert (settings.DATA_ENV, settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION) == original


def test_governance_mode_requires_permission_before_side_effects(monkeypatch, isolated_db):
    monkeypatch.setitem(staff_rbac.ROLE_PERMISSIONS, "modify_workflow", set())
    response = client.post("/api/v1/governance/mode", headers=_auth_headers(), json={"mode": "DEVELOPMENT"})

    assert response.status_code == 403
    assert isolated_db.writes == []


def test_authorized_governance_mode_transition_remains_available(monkeypatch, isolated_db):
    import apps.api.app.adapters.diw as diw
    import apps.api.app.adapters.rid as rid
    import apps.api.app.adapters.thaiwater as thaiwater

    monkeypatch.setattr(diw, "load_diw_facilities", lambda: [])
    monkeypatch.setattr(settings, "DATA_ENV", settings.DATA_ENV)
    monkeypatch.setattr(settings, "REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION", settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION)
    async def fetch_stations():
        return []
    monkeypatch.setattr(thaiwater, "fetch_thaiwater_stations", fetch_stations)
    async def fetch_reservoirs():
        return []
    monkeypatch.setattr(rid, "fetch_rid_reservoirs", fetch_reservoirs)

    response = client.post("/api/v1/governance/mode", headers=_auth_headers(), json={"mode": "DEVELOPMENT"})

    assert response.status_code == 200
    assert response.json()["mode"] == "DEVELOPMENT"
    assert settings.DATA_ENV == "DEVELOPMENT"
    assert settings.REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION is False
    assert isolated_db.writes == [("commit", None)]


@pytest.mark.parametrize("headers,expected_status", [({}, 401), ({"X-Admin-Key": "bad"}, 401)])
def test_denied_telemetry_sync_does_not_fetch_or_write(monkeypatch, isolated_db, headers, expected_status):
    import apps.api.app.api.v1.telemetry as telemetry

    calls = []
    async def forbidden_fetch():
        calls.append("upstream")
        raise AssertionError("denied request reached an adapter")
    monkeypatch.setattr(telemetry, "fetch_thaiwater_stations", forbidden_fetch)
    monkeypatch.setattr(telemetry, "fetch_rid_reservoirs", forbidden_fetch)

    response = client.post("/api/v1/telemetry/sync", headers=headers)

    assert response.status_code == expected_status
    assert calls == []
    assert isolated_db.writes == []


def test_telemetry_sync_requires_modify_workflow(monkeypatch, isolated_db):
    import apps.api.app.api.v1.telemetry as telemetry

    monkeypatch.setitem(staff_rbac.ROLE_PERMISSIONS, "modify_workflow", set())
    async def forbidden_fetch():
        raise AssertionError("denied request reached an adapter")
    monkeypatch.setattr(telemetry, "fetch_thaiwater_stations", forbidden_fetch)
    monkeypatch.setattr(telemetry, "fetch_rid_reservoirs", forbidden_fetch)

    response = client.post("/api/v1/telemetry/sync", headers=_auth_headers())

    assert response.status_code == 403
    assert isolated_db.writes == []


def test_authorized_telemetry_sync_still_runs(monkeypatch, isolated_db):
    import apps.api.app.api.v1.telemetry as telemetry

    calls = []
    async def fetch_stations():
        calls.append("stations")
        return []
    async def fetch_reservoirs():
        calls.append("reservoirs")
        return []
    monkeypatch.setattr(telemetry, "fetch_thaiwater_stations", fetch_stations)
    monkeypatch.setattr(telemetry, "fetch_rid_reservoirs", fetch_reservoirs)

    response = client.post("/api/v1/telemetry/sync", headers=_auth_headers())

    assert response.status_code == 200
    assert calls == ["stations", "reservoirs"]
    assert isolated_db.writes == [("commit", None)]


def test_telemetry_gets_are_read_only_and_do_not_fetch_on_empty_db(monkeypatch, isolated_db):
    import apps.api.app.api.v1.telemetry as telemetry

    monkeypatch.setattr(settings, "REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION", False)
    async def forbidden_fetch():
        raise AssertionError("read-only GET reached an adapter")
    monkeypatch.setattr(telemetry, "fetch_thaiwater_stations", forbidden_fetch)
    monkeypatch.setattr(telemetry, "fetch_rid_reservoirs", forbidden_fetch)

    stations = client.get("/api/v1/telemetry/stations")
    reservoirs = client.get("/api/v1/telemetry/reservoirs")

    assert stations.status_code == reservoirs.status_code == 200
    assert stations.json() == reservoirs.json() == []
    assert isolated_db.queries == [WaterStation, Reservoir]
    assert isolated_db.writes == []


@pytest.mark.parametrize("data_env", ["DEVELOPMENT", "PRODUCTION"])
@pytest.mark.parametrize("private_gate", [False, True])
def test_http_test_mode_never_changes_fail_closed_forecast(monkeypatch, data_env, private_gate):
    monkeypatch.setattr(settings, "DATA_ENV", data_env)
    monkeypatch.setattr(settings, "REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION", private_gate)
    normal = client.get("/api/v1/forecast/?station=prachin_mueang")
    test_mode = client.get("/api/v1/forecast/?station=prachin_mueang&test_mode=true")

    assert normal.status_code == test_mode.status_code == 200
    assert normal.json() == test_mode.json()
    assert normal.json()["status"] == "FORECAST_UNAVAILABLE"
    assert normal.json()["forecast_days"] == []
