import hashlib
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image, TiffImagePlugin
import scripts.migrate_citizen_media_boundary as media_migration

from apps.api.app.core.config import settings
from apps.api.app.core.database import SessionLocal
from apps.api.app.main import app
from apps.api.app.models.entities import CitizenReport, CitizenReportAuditLog, CitizenReportVerification
from scripts.migrate_citizen_media_boundary import (
    ReportMedia,
    ReconciliationError,
    apply_migration,
    dry_run_report,
    rollback_migration,
)


client = TestClient(app)
VALID_IMAGE = "evd_0123456789abcdef.jpg"


@pytest.fixture
def private_root(tmp_path, monkeypatch):
    root = tmp_path / "private-media"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    monkeypatch.setattr(settings, "PRIVATE_MEDIA_ROOT", root)
    return root


def _report(report_id, photo_url, state="PRIVATE", verification_status="UNVERIFIED"):
    return CitizenReport(
        id=report_id,
        reporter_name="Citizen media record",
        reporter_role="CITIZEN",
        exact_latitude=13.9,
        exact_longitude=101.7,
        latitude=13.9,
        longitude=101.7,
        public_latitude=13.9,
        public_longitude=101.7,
        district="Media test",
        subdistrict="Media test",
        description="Media boundary fixture",
        provenance={"source_agency": "Citizen", "category": "CITIZEN_REPORTED"},
        photo_url=photo_url,
        publication_state=state,
        verification_status=verification_status,
        created_at=datetime.now(timezone.utc),
    )


def _cleanup(ids):
    with SessionLocal() as db:
        db.query(CitizenReportAuditLog).filter(CitizenReportAuditLog.report_id.in_(ids)).delete(synchronize_session=False)
        db.query(CitizenReportVerification).filter(CitizenReportVerification.report_id.in_(ids)).delete(synchronize_session=False)
        db.query(CitizenReport).filter(CitizenReport.id.in_(ids)).delete(synchronize_session=False)
        db.commit()


def _save_private(root: Path, name=VALID_IMAGE, content=b"sanitized-image"):
    target = root / name
    target.write_bytes(content)
    target.chmod(0o600)
    return target


def _generated_image(fmt="JPEG", *, color="navy", exif=None, gps=False):
    image = Image.new("RGB", (3, 2), color)
    if exif is True:
        exif = Image.Exif()
        exif[271] = "legacy camera metadata"
    if gps:
        exif = Image.Exif()
        rational = TiffImagePlugin.IFDRational
        exif._ifds[34853] = {
            1: "N",
            2: (rational(13, 1), rational(58, 1), rational(0, 1)),
            3: "E",
            4: (rational(100, 1), rational(30, 1), rational(0, 1)),
        }
    output = BytesIO()
    image.save(output, format=fmt, exif=exif if exif is not None else b"")
    return output.getvalue()


def _add_reports(reports, verification_rows=()):
    with SessionLocal() as db:
        db.add_all(reports)
        db.add_all(verification_rows)
        db.commit()


def test_public_media_is_publication_bound_and_unpublish_revokes_immediately(private_root, request):
    suffix = uuid4().hex[:8]
    ids = [f"p03-safe-{suffix}", f"p03-verified-{suffix}", f"p03-private-{suffix}", f"p03-withheld-{suffix}", f"p03-unknown-{suffix}"]
    request.addfinalizer(lambda: _cleanup(ids))
    names = [f"evd_{uuid4().hex[:16]}.jpg" for _ in ids]
    bodies = [b"safe", b"verified", b"private", b"withheld", b"unknown"]
    for name, body in zip(names, bodies):
        _save_private(private_root, name, body)
    reports = [
        _report(ids[0], names[0], "PUBLIC_SAFE_SUMMARY"),
        _report(ids[1], names[1], "PUBLIC_VERIFIED", "VERIFIED_OBSERVATION"),
        _report(ids[2], names[2], "PRIVATE"),
        _report(ids[3], names[3], "WITHHELD"),
        _report(ids[4], names[4], "UNKNOWN_STATE"),
    ]
    verification = CitizenReportVerification(
        id=f"p03-verification-{suffix}", report_id=ids[1],
        verification_status="VERIFIED_OBSERVATION", verification_method="FIELD_VERIFICATION",
        verified_by="test-reviewer", verified_at=datetime.now(timezone.utc),
        structured_assessment={"what_was_observed": "visible standing water"},
    )
    _add_reports(reports, [verification])

    for report_id, expected in zip(ids, bodies):
        response = client.get(f"/api/public/reports/{report_id}/media")
        if report_id in ids[:2]:
            assert response.status_code == 200
            assert response.content == expected
            assert response.headers["cache-control"] == "no-store"
        else:
            assert response.status_code == 404

    observation = next(
        item for item in client.get(f"/api/public/observations?district=Media%20test").json()
        if item["id"].endswith(ids[0])
    )
    assert observation["photo_url"] == f"/api/public/reports/{ids[0]}/media"
    assert names[0] not in str(observation)

    with SessionLocal() as db:
        report = db.query(CitizenReport).filter(CitizenReport.id == ids[0]).first()
        report.publication_state = "PRIVATE"
        db.commit()
    assert client.get(f"/api/public/reports/{ids[0]}/media").status_code == 404


def test_static_and_filename_routes_are_not_media_boundaries(private_root):
    _save_private(private_root)
    assert client.get(f"/uploads/{VALID_IMAGE}").status_code == 404
    assert client.get(f"/api/v1/admin/evidence/{VALID_IMAGE}").status_code == 404
    assert client.get(f"/api/v1/admin/reports/p03-any/media/{VALID_IMAGE}").status_code == 404


def test_staff_media_requires_permission_and_audits_success(private_root, request):
    report_id = f"p03-staff-{uuid4().hex[:8]}"
    request.addfinalizer(lambda: _cleanup([report_id]))
    _save_private(private_root, content=b"staff-only")
    _add_reports([_report(report_id, VALID_IMAGE, "PRIVATE")])
    url = f"/api/v1/admin/reports/{report_id}/media"

    assert client.get(url).status_code == 401
    assert client.get(url, headers={"X-Admin-Key": "invalid"}).status_code == 401
    denied = client.get(url, headers={"X-Admin-Key": settings.ADMIN_API_KEY, "X-Staff-Role": "SYSTEM"})
    assert denied.status_code == 400
    assert denied.json()["error"]["code"] == "INVALID_REQUEST"
    missing = client.get(f"/api/v1/admin/reports/{report_id}-missing/media", headers={"X-Admin-Key": settings.ADMIN_API_KEY})
    assert missing.status_code == 404
    success = client.get(url, headers={"X-Admin-Key": settings.ADMIN_API_KEY})
    assert success.status_code == 200
    assert success.content == b"staff-only"
    with SessionLocal() as db:
        audit = db.query(CitizenReportAuditLog).filter(
            CitizenReportAuditLog.report_id == report_id,
            CitizenReportAuditLog.action == "EVIDENCE_MEDIA_VIEWED",
        ).first()
        assert audit is not None
        assert audit.actor_id == "admin_user"


def test_traversal_symlink_and_bad_storage_fail_closed(private_root, tmp_path, request):
    report_id = f"p03-path-{uuid4().hex[:8]}"
    request.addfinalizer(lambda: _cleanup([report_id]))
    outside = tmp_path / VALID_IMAGE
    outside.write_bytes(b"outside")
    (private_root / VALID_IMAGE).symlink_to(outside)
    _add_reports([_report(report_id, "../" + VALID_IMAGE, "PUBLIC_SAFE_SUMMARY")])
    assert client.get(f"/api/public/reports/{report_id}/media").status_code == 404
    with SessionLocal() as db:
        report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
        report.photo_url = VALID_IMAGE
        db.commit()
    assert client.get(f"/api/public/reports/{report_id}/media").status_code == 404

    private_root.chmod(0o755)
    ready = client.get("/health/ready")
    assert ready.status_code == 503
    assert ready.json()["dependencies"]["storage"] == "DEGRADED"
    image = Image.new("RGB", (1, 1), "blue")
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    upload = client.post("/api/public/reports/upload-photo", files={"photo": ("image.jpg", buffer.getvalue(), "image/jpeg")})
    assert upload.status_code == 503


def test_upload_sanitizer_writes_private_file_and_never_returns_public_url(private_root):
    image = Image.new("RGB", (2, 2), "red")
    exif = Image.Exif()
    exif[271] = "camera-private-metadata"
    input_buffer = BytesIO()
    image.save(input_buffer, format="JPEG", exif=exif)
    response = client.post(
        "/api/public/reports/upload-photo",
        files={"photo": ("camera.jpg", input_buffer.getvalue(), "image/jpeg")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == payload["photo_url"]
    assert not payload["photo_url"].startswith("/")
    stored = private_root / payload["filename"]
    assert stored.exists()
    assert stored.stat().st_mode & 0o777 == 0o600
    assert Image.open(stored).getexif() == {}


def test_migration_dry_run_quarantines_collision_orphan_and_bad_reference(tmp_path):
    first = tmp_path / "legacy-one"
    second = tmp_path / "legacy-two"
    first.mkdir()
    second.mkdir()
    shared_name = f"evd_{uuid4().hex[:16]}.jpg"
    orphan_name = f"evd_{uuid4().hex[:16]}.jpg"
    (first / shared_name).write_bytes(_generated_image())
    (second / shared_name).write_bytes(_generated_image(color="orange"))
    (first / orphan_name).write_bytes(_generated_image())
    plan = dry_run_report(
        [ReportMedia("collision-report", shared_name, "PRIVATE"), ReportMedia("bad-report", "../bad.jpg", None)],
        [first, second],
    )
    statuses = {item.get("status") for item in plan["items"]}
    assert "QUARANTINE_BYTE_COLLISION" in statuses
    assert "ORPHAN" in statuses
    assert "QUARANTINE_UNSAFE_REFERENCE" in statuses


@pytest.mark.parametrize(
    ("filename", "content", "expected_status"),
    [
        ("evd_0123456789abcdef.jpg", _generated_image(), "READY_COPY"),
        ("evd_1123456789abcdef.jpg", _generated_image(exif=True), "QUARANTINE_UNSANITIZED_IMAGE"),
        ("evd_2123456789abcdef.jpg", _generated_image(gps=True), "QUARANTINE_UNSANITIZED_IMAGE"),
        ("evd_3123456789abcdef.jpg", b"\xff\xd8\xff truncated", "QUARANTINE_UNSANITIZED_IMAGE"),
        ("evd_4123456789abcdef.png", _generated_image(fmt="JPEG"), "QUARANTINE_UNSANITIZED_IMAGE"),
        ("evd_5123456789abcdef.jpg", b"not an image", "QUARANTINE_UNSANITIZED_IMAGE"),
    ],
    ids=["sanitized", "exif", "gps", "malformed", "extension-mismatch", "non-image"],
)
def test_migration_only_marks_proven_sanitized_images_ready(tmp_path, filename, content, expected_status):
    source = tmp_path / "legacy"
    source.mkdir()
    (source / filename).write_bytes(content)

    plan = dry_run_report([ReportMedia("image-report", filename, "PRIVATE")], [source])

    assert plan["items"][0]["status"] == expected_status


def test_migration_apply_and_manifest_rollback_use_isolated_test_database(tmp_path, request):
    suffix = uuid4().hex[:8]
    report_id = f"p03-migrate-{suffix}"
    filename = f"evd_{uuid4().hex[:16]}.jpg"
    source_root = tmp_path / "legacy-copy"
    private_root = tmp_path / "private-copy"
    source_root.mkdir()
    private_root.mkdir(mode=0o700)
    private_root.chmod(0o700)
    manifest = tmp_path / "rollback.json"
    content = _generated_image()
    (source_root / filename).write_bytes(content)
    request.addfinalizer(lambda: _cleanup([report_id]))
    report = _report(report_id, f"/uploads/{filename}", "PRIVATE")
    _add_reports([report])
    before_ref = ReportMedia(report_id, f"/uploads/{filename}", "PRIVATE")
    plan = dry_run_report([before_ref], [source_root])
    assert plan["summary"]["ready_copy"] == 1

    with SessionLocal() as db:
        from apps.api.app.models.entities import CitizenReport
        records = [ReportMedia(row.id, row.photo_url, row.publication_state) for row in db.query(CitizenReport.id, CitizenReport.photo_url, CitizenReport.publication_state).all()]
        applied = apply_migration(plan, records, private_root, manifest, db)
        current = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
        assert current.photo_url == filename
        assert (private_root / filename).read_bytes() == content
        assert applied["before"]["total_records"] == applied["after"]["total_records"]
        assert applied["before"]["per_state_counts"] == applied["after"]["per_state_counts"]
        assert applied["before"]["public_ids"] == applied["after"]["public_ids"]
        assert applied["after"]["media_hashes"][filename] == hashlib.sha256(content).hexdigest()

        rolled_back = rollback_migration(manifest, private_root, db_session=db)
        current = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
        assert current.photo_url == f"/uploads/{filename}"
        assert not (private_root / filename).exists()
        assert rolled_back["after"]["reports_checksum"] == applied["before"]["reports_checksum"]
        assert rolled_back["after"]["media_hashes"] == applied["before"]["media_hashes"]


def test_migration_manifest_integrity_is_checked(tmp_path):
    manifest = tmp_path / "manifest.json"
    manifest.write_text('{"created_files": [], "integrity_sha256": "bad"}', encoding="utf-8")
    root = tmp_path / "private"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    with pytest.raises(ReconciliationError, match="integrity"):
        rollback_migration(manifest, root, reports=[])


def test_failed_rollback_reconciliation_restores_database_and_files(tmp_path, request, monkeypatch):
    suffix = uuid4().hex[:8]
    report_id = f"p03-migrate-atomic-{suffix}"
    filename = f"evd_{uuid4().hex[:16]}.jpg"
    source_root = tmp_path / "legacy-atomic"
    private_root = tmp_path / "private-atomic"
    source_root.mkdir()
    private_root.mkdir(mode=0o700)
    private_root.chmod(0o700)
    manifest = tmp_path / "atomic-rollback.json"
    content = _generated_image()
    (source_root / filename).write_bytes(content)
    request.addfinalizer(lambda: _cleanup([report_id]))
    original_reference = f"/uploads/{filename}"
    _add_reports([_report(report_id, original_reference, "PRIVATE")])
    plan = dry_run_report([ReportMedia(report_id, original_reference, "PRIVATE")], [source_root])

    with SessionLocal() as db:
        from apps.api.app.models.entities import CitizenReport
        records = [ReportMedia(row.id, row.photo_url, row.publication_state) for row in db.query(CitizenReport.id, CitizenReport.photo_url, CitizenReport.publication_state).all()]
        apply_migration(plan, records, private_root, manifest, db)
        migrated_file = private_root / filename
        migrated_hash = hashlib.sha256(content).hexdigest()
        manifest_before_attempt = manifest.read_bytes()
        report_before_attempt = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
        assert report_before_attempt.photo_url == filename

        original_reconciliation = media_migration.reconciliation
        reconciliation_calls = 0

        def fail_final_reconciliation(*args, **kwargs):
            nonlocal reconciliation_calls
            reconciliation_calls += 1
            if reconciliation_calls == 2:
                raise ReconciliationError("forced rollback reconciliation failure")
            return original_reconciliation(*args, **kwargs)

        monkeypatch.setattr(media_migration, "reconciliation", fail_final_reconciliation)
        with pytest.raises(ReconciliationError, match="forced rollback reconciliation failure"):
            rollback_migration(manifest, private_root, db_session=db)

        db.expire_all()
        report_after_attempt = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
        assert report_after_attempt.photo_url == filename
        assert migrated_file.is_file()
        assert hashlib.sha256(migrated_file.read_bytes()).hexdigest() == migrated_hash
        assert not list(private_root.glob(".media-rollback-*"))
        assert manifest.read_bytes() == manifest_before_attempt
