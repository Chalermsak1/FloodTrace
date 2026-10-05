import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from apps.api.app.core.database import SessionLocal
from apps.api.app.core.publication import (
    LEGACY_CLIENT_SUBSTITUTION_FINGERPRINT,
    public_report_predicate,
    verification_is_valid,
)
from apps.api.app.main import app
from apps.api.app.models.entities import CitizenReport, CitizenReportVerification
from scripts.migrate_citizen_publication_boundary import (
    ReconciliationError,
    apply_migration,
    dry_run_report,
    proposed_state,
    reconcile,
    rollback_migration,
)


client = TestClient(app)


def test_migration_proposal_never_promotes_reports():
    assert proposed_state("PUBLIC_SAFE_SUMMARY") == "PUBLIC_SAFE_SUMMARY"
    assert proposed_state("PUBLIC_VERIFIED") == "PUBLIC_VERIFIED"
    assert proposed_state("PRIVATE") == "PRIVATE"
    assert proposed_state("WITHHELD") == "WITHHELD"
    assert proposed_state("SUPPRESSED") == "WITHHELD"
    assert proposed_state(None) == "PRIVATE"
    assert proposed_state("   ") == "PRIVATE"
    assert proposed_state("unknown") == "PRIVATE"
    assert proposed_state("private") == "PRIVATE"


def _cleanup_reports(report_ids):
    with SessionLocal() as db:
        db.query(CitizenReportVerification).filter(
            CitizenReportVerification.report_id.in_(report_ids)
        ).delete(synchronize_session=False)
        db.query(CitizenReport).filter(CitizenReport.id.in_(report_ids)).delete(synchronize_session=False)
        db.commit()


def _report(report_id, district, state, verification_status="UNVERIFIED"):
    return CitizenReport(
        id=report_id,
        reporter_name="P02 citizen",
        reporter_role="CITIZEN",
        description=f"description-{report_id}",
        district=district,
        subdistrict="P02 subdistrict",
        latitude=13.9,
        longitude=101.7,
        exact_latitude=13.9,
        exact_longitude=101.7,
        public_latitude=13.9,
        public_longitude=101.7,
        contamination_signs=["test observation"],
        verification_status=verification_status,
        publication_state=state,
        provenance={"source_agency": "Citizen", "category": "CITIZEN_REPORTED"},
        created_at=datetime.now(timezone.utc),
    )


def test_shared_publication_boundary_filters_every_report_surface(monkeypatch, request):
    from apps.api.app.api.v1 import risk

    async def empty_forecast(_key):
        return {"forecast_days": []}

    monkeypatch.setattr(risk, "fetch_openmeteo_forecast", empty_forecast)
    suffix = uuid4().hex[:8]
    district = f"P02-{suffix}"
    ids = {
        "safe": f"p02-safe-{suffix}",
        "verified": f"p02-valid-{suffix}",
        "private": f"p02-private-{suffix}",
        "withheld": f"p02-withheld-{suffix}",
        "legacy": f"p02-legacy-{suffix}",
        "null": f"p02-null-{suffix}",
        "unknown": f"p02-unknown-{suffix}",
        "suppressed": f"p02-suppressed-{suffix}",
        "substituted": f"p02-substituted-{suffix}",
        "latest_invalid": f"p02-latest-invalid-{suffix}",
        "re_review": f"p02-re-review-{suffix}",
    }
    request.addfinalizer(lambda: _cleanup_reports(ids.values()))
    with SessionLocal() as db:
        db.add_all([
            _report(ids["safe"], district, "PUBLIC_SAFE_SUMMARY"),
            _report(ids["verified"], district, "PUBLIC_VERIFIED", "VERIFIED_OBSERVATION"),
            _report(ids["private"], district, "PRIVATE"),
            _report(ids["withheld"], district, "WITHHELD"),
            _report(ids["legacy"], district, "PUBLIC_VERIFIED", "VERIFIED_OBSERVATION"),
            _report(ids["null"], district, None),
            _report(ids["unknown"], district, "UNRECOGNIZED"),
            _report(ids["suppressed"], district, "SUPPRESSED"),
            _report(ids["substituted"], district, "PUBLIC_VERIFIED", "VERIFIED_OBSERVATION"),
            _report(ids["latest_invalid"], district, "PUBLIC_VERIFIED", "VERIFIED_OBSERVATION"),
            _report(ids["re_review"], district, "PUBLIC_VERIFIED", "VERIFIED_OBSERVATION"),
        ])
        db.flush()
        db.query(CitizenReport).filter(CitizenReport.id == ids["null"]).update(
            {CitizenReport.publication_state: None}, synchronize_session=False
        )
        db.add(CitizenReportVerification(
            id=f"p02-verification-{suffix}",
            report_id=ids["verified"],
            verification_status="VERIFIED_OBSERVATION",
            verification_method="FIELD_VERIFICATION",
            verified_by="test-reviewer",
            verified_at=datetime.now(timezone.utc),
            structured_assessment={"what_was_observed": "visible surface film"},
        ))
        db.add(CitizenReportVerification(
            id=f"p02-legacy-verification-{suffix}",
            report_id=ids["legacy"],
            verification_status="VERIFIED_OBSERVATION",
            verification_method="FIELD_VERIFICATION",
            verified_by="legacy-reviewer",
            verified_at=datetime.now(timezone.utc),
            structured_assessment={"what_was_observed": "   "},
        ))
        substituted = dict(LEGACY_CLIENT_SUBSTITUTION_FINGERPRINT)
        db.add(CitizenReportVerification(
            id=f"p02-substituted-verification-{suffix}",
            report_id=ids["substituted"],
            verification_status="VERIFIED_OBSERVATION",
            verification_method="FIELD_VERIFICATION",
            verified_by="legacy-client",
            verified_at=datetime.now(timezone.utc),
            structured_assessment=substituted,
        ))
        db.add_all([
            CitizenReportVerification(
                id=f"p02-latest-earlier-valid-{suffix}",
                report_id=ids["latest_invalid"],
                verification_status="VERIFIED_OBSERVATION",
                verification_method="FIELD_VERIFICATION",
                verified_by="reviewer",
                verified_at=datetime.now(timezone.utc) - timedelta(days=2),
                structured_assessment={"what_was_observed": "observed earlier valid fact"},
            ),
            CitizenReportVerification(
                id=f"p02-latest-later-invalid-{suffix}",
                report_id=ids["latest_invalid"],
                verification_status="VERIFIED_OBSERVATION",
                verification_method="FIELD_VERIFICATION",
                verified_by="reviewer",
                verified_at=datetime.now(timezone.utc) - timedelta(days=1),
                structured_assessment={"what_was_observed": "   "},
            ),
            CitizenReportVerification(
                id=f"p02-rereview-old-substitution-{suffix}",
                report_id=ids["re_review"],
                verification_status="VERIFIED_OBSERVATION",
                verification_method="FIELD_VERIFICATION",
                verified_by="legacy-client",
                verified_at=datetime.now(timezone.utc) - timedelta(days=1),
                structured_assessment=substituted,
            ),
            CitizenReportVerification(
                id=f"p02-rereview-current-valid-{suffix}",
                report_id=ids["re_review"],
                verification_status="VERIFIED_OBSERVATION",
                verification_method="FIELD_VERIFICATION",
                verified_by="reviewer",
                verified_at=datetime.now(timezone.utc),
                structured_assessment={"what_was_observed": "new explicit field observation"},
            ),
        ])
        db.commit()

        eligible = {
            row.id for row in db.query(CitizenReport)
            .filter(CitizenReport.district == district, public_report_predicate())
            .all()
        }
        assert eligible == {ids["safe"], ids["verified"], ids["re_review"]}
        assert not verification_is_valid(
            "VERIFIED_OBSERVATION", substituted, "FIELD_VERIFICATION", None
        )
        latest = db.query(CitizenReportVerification).filter(
            CitizenReportVerification.report_id == ids["latest_invalid"]
        ).order_by(CitizenReportVerification.verified_at.desc(), CitizenReportVerification.id.desc()).first()
        assert latest.id == f"p02-latest-later-invalid-{suffix}"
        assert not verification_is_valid(
            latest.verification_status,
            latest.structured_assessment,
            latest.verification_method,
            latest.official_source_evidence,
        )

    expected = {ids["safe"], ids["verified"], ids["re_review"]}
    observations = client.get(f"/api/public/observations?district={district}").json()
    assert {item["id"].removeprefix("obs_") for item in observations} == expected

    my_area = client.get(f"/api/public/my-area?district={district}").json()
    assert my_area["community_observation_count"] == 3

    with SessionLocal() as db:
        expected_overview_count = db.query(CitizenReport).filter(
            public_report_predicate(),
            CitizenReport.verification_status.notin_(["TEST_DEMO", "REJECTED"]),
            CitizenReport.reporter_role != "TEST/DEMO",
        ).count()
    assert client.get("/api/public/overview").json()["total_citizen_reports"] == expected_overview_count

    reports = client.get("/api/v1/reports/").json()
    assert {item["id"] for item in reports if item["id"] in ids.values()} == expected

    clusters = client.get("/api/v1/reports/clusters").json()
    district_clusters = [item for item in clusters if item["district"] == district]
    assert len(district_clusters) == 1
    assert district_clusters[0]["observation_count"] == 3

    assert client.get(f"/api/v1/risk/area-card/{district}").status_code == 404
    assert client.get(f"/api/v1/risk/evidence-packet/p02-{suffix}?district={district}").status_code == 404
    assert client.get(f"/api/v1/risk/my-area?district={district}").status_code == 404

    for report_id in (ids["substituted"], ids["latest_invalid"]):
        tracking = client.get(f"/api/public/reports/track/{report_id}").json()
        assert tracking["verification_level"] == "LEGACY_UNVALIDATED"
        assert report_id not in {item["id"].removeprefix("obs_") for item in observations}

    from shapely.geometry import box
    from apps.api.app.services.spatial_monitoring_service import SpatialMonitoringService

    spatial = SpatialMonitoringService()
    spatial.cells = [{
        "id": "p02-cell",
        "name": "P02 cell",
        "district": district,
        "subdistrict": "P02 subdistrict",
        "center_lat": 13.9,
        "center_lon": 101.7,
        "geometry": box(101.699, 13.899, 101.701, 13.901),
    }]
    with SessionLocal() as db:
        surface = spatial.compute_monitoring_priority_surface(db, district=district)
    assert surface["features"][0]["properties"]["citizen_report_count"] == 3
    assert surface["features"][0]["properties"]["verified_report_count"] == 2


def test_migration_dry_run_apply_and_manifest_rollback(tmp_path, request):
    suffix = uuid4().hex[:8]
    states = {
        f"p02-migrate-suppressed-{suffix}": "SUPPRESSED",
        f"p02-migrate-null-{suffix}": None,
        f"p02-migrate-blank-{suffix}": "   ",
        f"p02-migrate-unknown-{suffix}": "UNRECOGNIZED",
        f"p02-migrate-private-{suffix}": "PRIVATE",
        f"p02-migrate-safe-{suffix}": "PUBLIC_SAFE_SUMMARY",
        f"p02-migrate-verified-{suffix}": "PUBLIC_VERIFIED",
    }
    ids = list(states)
    request.addfinalizer(lambda: _cleanup_reports(ids))
    with SessionLocal() as db:
        db.add_all(_report(report_id, f"P02-MIGRATION-{suffix}", state) for report_id, state in states.items())
        db.flush()
        db.query(CitizenReport).filter(CitizenReport.id == f"p02-migrate-null-{suffix}").update(
            {CitizenReport.publication_state: None}, synchronize_session=False
        )
        db.commit()
        before, _ = reconcile(db)
        preview = dry_run_report(db)
        after_preview, _ = reconcile(db)
    assert preview["mode"] == "DRY_RUN"
    assert preview["changed_count"] == 4
    assert preview["before"]["total_records"] == preview["after"]["total_records"]
    assert preview["before"]["public_ids"] == preview["after"]["public_ids"]
    assert before == after_preview

    manifest_path = tmp_path / "publication-rollback.json"
    with SessionLocal() as db:
        applied = apply_migration(db, manifest_path)
    assert applied["mode"] == "APPLIED"
    assert applied["before"] == before
    assert applied["after"]["total_records"] == before["total_records"]
    assert applied["after"]["public_ids"] == before["public_ids"]
    assert {item["report_id"] for item in applied["changes"]} == {
        f"p02-migrate-suppressed-{suffix}",
        f"p02-migrate-null-{suffix}",
        f"p02-migrate-blank-{suffix}",
        f"p02-migrate-unknown-{suffix}",
    }
    with SessionLocal() as db:
        current, _ = reconcile(db)
        assert current == applied["after"]
        report_states = dict(db.query(CitizenReport.id, CitizenReport.publication_state).filter(
            CitizenReport.id.in_(ids)
        ).all())
    assert report_states[f"p02-migrate-suppressed-{suffix}"] == "WITHHELD"
    assert report_states[f"p02-migrate-null-{suffix}"] == "PRIVATE"
    assert report_states[f"p02-migrate-blank-{suffix}"] == "PRIVATE"
    assert report_states[f"p02-migrate-unknown-{suffix}"] == "PRIVATE"
    assert report_states[f"p02-migrate-safe-{suffix}"] == "PUBLIC_SAFE_SUMMARY"
    assert report_states[f"p02-migrate-verified-{suffix}"] == "PUBLIC_VERIFIED"

    original_manifest = manifest_path.read_text(encoding="utf-8")
    tampered = json.loads(original_manifest)
    tampered["changes"][0]["after_state"] = "PUBLIC_SAFE_SUMMARY"
    manifest_path.write_text(json.dumps(tampered), encoding="utf-8")
    with SessionLocal() as db:
        with pytest.raises(ReconciliationError, match="checksum"):
            rollback_migration(db, manifest_path)
        current, _ = reconcile(db)
    assert current == applied["after"]

    manifest_path.write_text(original_manifest, encoding="utf-8")
    with SessionLocal() as db:
        rolled_back = rollback_migration(db, manifest_path)
    assert rolled_back["mode"] == "ROLLED_BACK"
    assert rolled_back["before"] == applied["after"]
    assert rolled_back["after"] == applied["before"]
    with SessionLocal() as db:
        restored, _ = reconcile(db)
    assert restored == before


def test_apply_reconciliation_failure_rolls_back_transaction(tmp_path, request, monkeypatch):
    from scripts import migrate_citizen_publication_boundary as migration

    suffix = uuid4().hex[:8]
    report_id = f"p02-atomic-{suffix}"
    request.addfinalizer(lambda: _cleanup_reports([report_id]))
    with SessionLocal() as db:
        db.add(_report(report_id, f"P02-ATOMIC-{suffix}", "SUPPRESSED"))
        db.commit()
        before, _ = reconcile(db)

    actual_reconcile = migration.reconcile

    def inconsistent_reconcile(db):
        snapshot, records = actual_reconcile(db)
        snapshot = dict(snapshot)
        snapshot["state_checksum"] = "0" * 64
        return snapshot, records

    monkeypatch.setattr(migration, "reconcile", inconsistent_reconcile)
    manifest_path = tmp_path / "must-not-exist.json"
    with SessionLocal() as db:
        with pytest.raises(ReconciliationError, match="reconciliation mismatch"):
            apply_migration(db, manifest_path)
    assert not manifest_path.exists()
    with SessionLocal() as db:
        after, _ = actual_reconcile(db)
        state = db.query(CitizenReport.publication_state).filter(CitizenReport.id == report_id).scalar()
    assert after == before
    assert state == "SUPPRESSED"
