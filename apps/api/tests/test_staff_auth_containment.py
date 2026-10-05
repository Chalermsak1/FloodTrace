from urllib.parse import urlencode

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

from apps.api.app.core.config import Settings, settings
from apps.api.app.core.staff_rbac import ROLE_PERMISSIONS, get_current_staff_user
from apps.api.app.main import app
from apps.api.app.models.entities import StaffUser


client = TestClient(app)


def _staff(*, user_id="staff_admin_01", username="admin_user", role="ADMIN", active=True):
    return StaffUser(
        id=user_id,
        username=username,
        display_name="Resolved database principal",
        role=role,
        email="principal@example.invalid",
        department="Test",
        is_active=active,
    )


class _Query:
    def __init__(self, records):
        self.records = records

    def filter(self, condition):
        column_name = condition.left.key
        expected = condition.right.value
        self.records = [record for record in self.records if getattr(record, column_name) == expected]
        return self

    def all(self):
        return self.records


class _Db:
    def __init__(self, records):
        self.records = records

    def query(self, model):
        assert model is StaffUser
        return _Query(self.records)


def _resolve(records, *, headers=None, query=None, key=None):
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/v1/admin/auth/me",
        "raw_path": b"/api/v1/admin/auth/me",
        "query_string": urlencode(query or {}, doseq=True).encode(),
        "headers": [(name.lower().encode(), value.encode()) for name, value in (headers or {}).items()],
        "server": ("testserver", 80),
        "client": ("127.0.0.1", 1234),
        "root_path": "",
    }
    return get_current_staff_user(Request(scope), header_key=key, credentials=None, db=_Db(records))


@pytest.mark.parametrize(
    ("headers", "query"),
    [
        ({}, {"token": "credential"}),
        ({}, {"key": "credential"}),
        ({"X-Staff-User": "admin_user"}, {}),
        ({"X-Staff-Role": "ADMIN"}, {}),
        ({"X-Username": "admin_user"}, {}),
        ({"X-Role": "ADMIN"}, {}),
        ({}, {"username": "admin_user"}),
        ({}, {"role": "ADMIN"}),
    ],
)
def test_caller_selected_credential_identity_or_role_is_invalid(headers, query):
    response = client.get(
        "/api/v1/admin/auth/me",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY, **headers},
        params=query,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


@pytest.mark.parametrize(
    ("headers", "expected_status", "expected_code"),
    [
        ({}, 401, "AUTH_ERROR"),
        ({"X-Admin-Key": "invalid"}, 401, "AUTH_ERROR"),
        ({"Authorization": "Bearer invalid"}, 401, "AUTH_ERROR"),
    ],
)
def test_missing_and_invalid_staff_credentials_fail_closed(headers, expected_status, expected_code):
    response = client.get("/api/v1/admin/auth/me", headers=headers)
    assert response.status_code == expected_status
    assert response.json()["error"]["code"] == expected_code


def test_default_principal_setting_is_staff_admin_01(monkeypatch):
    monkeypatch.delenv("STAFF_CONTAINMENT_PRINCIPAL_ID", raising=False)
    assert Settings(_env_file=None).STAFF_CONTAINMENT_PRINCIPAL_ID == "staff_admin_01"
    monkeypatch.setattr(settings, "STAFF_CONTAINMENT_PRINCIPAL_ID", "staff_admin_01")
    principal = _resolve([_staff()], key=settings.ADMIN_API_KEY)
    assert principal.user_id == "staff_admin_01"
    assert principal.username == "admin_user"
    assert principal.role.value == "ADMIN"


def test_explicitly_configured_active_admin_principal_authenticates(monkeypatch):
    monkeypatch.setattr(settings, "STAFF_CONTAINMENT_PRINCIPAL_ID", "staff_admin_custom")
    principal = _resolve([_staff(user_id="staff_admin_custom")], key=settings.ADMIN_API_KEY)
    assert principal.user_id == "staff_admin_custom"
    assert principal.username == "admin_user"
    assert principal.role.value == "ADMIN"


@pytest.mark.parametrize(
    ("principal_id", "records"),
    [
        ("staff_admin_01", []),
        ("configured_unknown", [_staff()]),
        ("staff_admin_01", [_staff(active=False)]),
        ("staff_admin_01", [_staff(username="renamed_admin")]),
        ("staff_admin_01", [_staff(user_id="mismatched_id")]),
        ("staff_admin_01", [_staff(role="REVIEWER")]),
        ("staff_admin_01", [_staff(), _staff(username="other_admin")]),
        ("", [_staff()]),
    ],
    ids=["missing", "unknown-no-fallback", "inactive", "renamed", "mismatched", "non-admin", "ambiguous", "empty-config"],
)
def test_configured_principal_failures_never_synthesize_staff(monkeypatch, principal_id, records):
    monkeypatch.setattr(settings, "STAFF_CONTAINMENT_PRINCIPAL_ID", principal_id)
    with pytest.raises(HTTPException) as error:
        _resolve(records, key=settings.ADMIN_API_KEY)
    assert error.value.status_code == 401


def test_fixed_active_database_principal_authenticates_with_header_or_bearer():
    header = client.get("/api/v1/admin/auth/me", headers={"X-Admin-Key": settings.ADMIN_API_KEY})
    bearer = client.get("/api/v1/admin/auth/me", headers={"Authorization": f"Bearer {settings.ADMIN_API_KEY}"})
    for response in (header, bearer):
        assert response.status_code == 200
        assert response.json()["user_id"] == "staff_admin_01"
        assert response.json()["username"] == "admin_user"
        assert response.json()["role"] == "ADMIN"


def test_valid_staff_without_required_permission_gets_access_denied(monkeypatch):
    monkeypatch.setitem(ROLE_PERMISSIONS, "verify_observation", set())
    response = client.post(
        "/api/v1/admin/reports/no-such-report/verify",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY},
        json={"verification_status": "UNVERIFIED", "verification_method": "OTHER"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCESS_DENIED"


@pytest.mark.parametrize("path", ["/api/internal/facilities", "/api/v1/internal/facilities"])
def test_internal_facility_auth_rejects_query_credentials_and_spoof_headers(path):
    query_credential = client.get(
        path,
        headers={"X-Admin-Key": settings.ADMIN_API_KEY},
        params={"token": "credential"},
    )
    spoofed_identity = client.get(
        path,
        headers={"X-Admin-Key": settings.ADMIN_API_KEY, "X-Staff-User": "other_user"},
    )
    assert query_credential.status_code == 400
    assert query_credential.json()["error"]["code"] == "INVALID_REQUEST"
    assert spoofed_identity.status_code == 400
    assert spoofed_identity.json()["error"]["code"] == "INVALID_REQUEST"
