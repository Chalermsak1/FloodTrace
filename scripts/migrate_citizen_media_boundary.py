"""Copy sanitized legacy report media into private storage without mutating sources."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import stat
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image

from apps.api.app.core.config import settings
from apps.api.app.core.private_media import PrivateMediaNotFound, normalize_media_reference


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_ROOTS = (REPOSITORY_ROOT / "data/uploads", REPOSITORY_ROOT / "apps/data/uploads")
PUBLIC_STATES = {"PUBLIC_SAFE_SUMMARY", "PUBLIC_VERIFIED"}
IMAGE_FORMAT_BY_EXTENSION = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
}
IMAGE_FORMAT_INFO_KEYS = {
    "JPEG": {"jfif", "jfif_version", "jfif_unit", "jfif_density", "progressive", "progression"},
    "PNG": {"transparency"},
    "WEBP": set(),
}


class ReconciliationError(RuntimeError):
    pass


@dataclass(frozen=True)
class ReportMedia:
    report_id: str
    photo_url: str | None
    publication_state: str | None


def _json_checksum(value: object) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    return hashlib.sha256(encoded).hexdigest()


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _validate_sanitized_image(path: Path, filename: str) -> str | None:
    """Return a quarantine reason unless bytes prove to be a clean supported image."""
    expected_format = IMAGE_FORMAT_BY_EXTENSION.get(Path(filename).suffix.lower())
    if expected_format is None:
        return "UNSUPPORTED_EXTENSION"
    try:
        with Image.open(path) as image:
            actual_format = image.format
            if actual_format != expected_format:
                return "EXTENSION_CONTENT_MISMATCH"
            image.verify()
        with Image.open(path) as image:
            if image.format != expected_format or getattr(image, "n_frames", 1) != 1:
                return "UNSUPPORTED_IMAGE_CONTENT"
            image.load()
            exif = image.getexif()
            if 34853 in exif:
                return "GPS_METADATA"
            if exif:
                return "EXIF_METADATA"
            info_keys = {str(key).lower() for key in image.info}
            if info_keys - IMAGE_FORMAT_INFO_KEYS[expected_format]:
                return "RESTRICTED_METADATA"
    except Exception:
        return "MALFORMED_IMAGE"
    return None


def _source_inventory(roots: Iterable[Path]) -> tuple[dict[str, list[dict]], list[dict]]:
    by_name: dict[str, list[dict]] = {}
    anomalies: list[dict] = []
    for root in roots:
        if not root.exists():
            continue
        if root.is_symlink() or not root.is_dir():
            anomalies.append({"source": str(root), "reason": "UNSAFE_ROOT"})
            continue
        for entry in os.scandir(root):
            path = Path(entry.path)
            if entry.is_symlink():
                anomalies.append({"source": str(path), "reason": "SYMLINK"})
                continue
            if entry.is_dir(follow_symlinks=False):
                anomalies.append({"source": str(path), "reason": "NESTED_DIRECTORY"})
                continue
            if not entry.is_file(follow_symlinks=False):
                anomalies.append({"source": str(path), "reason": "NOT_REGULAR_FILE"})
                continue
            try:
                name = normalize_media_reference(entry.name)
            except (PrivateMediaNotFound, OSError):
                anomalies.append({"source": str(path), "reason": "INVALID_NAME_OR_UNREADABLE"})
                continue
            validation_error = _validate_sanitized_image(path, name)
            if validation_error:
                anomalies.append({
                    "source": str(path),
                    "filename": name,
                    "reason": "UNSANITIZED_IMAGE_" + validation_error,
                })
                continue
            try:
                digest = _file_hash(path)
            except OSError:
                anomalies.append({"source": str(path), "reason": "INVALID_NAME_OR_UNREADABLE"})
                continue
            by_name.setdefault(name, []).append({"source": str(path), "sha256": digest})
    return by_name, anomalies


def dry_run_report(reports: Iterable[ReportMedia], source_roots: Iterable[Path]) -> dict:
    source_roots = list(source_roots)
    rows = [asdict(report) for report in reports]
    references: dict[str, list[dict]] = {}
    malformed: list[dict] = []
    for report in rows:
        if not isinstance(report["photo_url"], str) or not report["photo_url"].strip():
            continue
        try:
            name = normalize_media_reference(report["photo_url"])
        except PrivateMediaNotFound:
            malformed.append({"report_id": report["report_id"], "reference": report["photo_url"], "reason": "UNSAFE_REFERENCE"})
            continue
        references.setdefault(name, []).append(report)

    files, anomalies = _source_inventory(source_roots)
    rejected_names = {
        anomaly["filename"]: anomaly
        for anomaly in anomalies
        if anomaly.get("filename")
    }
    items = []
    referenced_names = set(references)
    for name, related_reports in references.items():
        if len(related_reports) != 1:
            items.append({"filename": name, "report_ids": [r["report_id"] for r in related_reports], "status": "QUARANTINE_SHARED_ASSOCIATION"})
            continue
        candidates = files.get(name, [])
        if not candidates:
            rejected = rejected_names.get(name)
            if rejected:
                items.append({
                    "filename": name,
                    "report_ids": [related_reports[0]["report_id"]],
                    "reason": rejected["reason"],
                    "status": "QUARANTINE_UNSANITIZED_IMAGE",
                })
            else:
                items.append({"filename": name, "report_ids": [related_reports[0]["report_id"]], "status": "MISSING_SOURCE"})
            continue
        hashes = {candidate["sha256"] for candidate in candidates}
        if len(hashes) > 1:
            items.append({"filename": name, "report_ids": [related_reports[0]["report_id"]], "sources": candidates, "status": "QUARANTINE_BYTE_COLLISION"})
            continue
        items.append({
            "filename": name,
            "report_id": related_reports[0]["report_id"],
            "reference_before": related_reports[0]["photo_url"],
            "reference_after": name,
            "publication_state": related_reports[0]["publication_state"],
            "sources": candidates,
            "sha256": next(iter(hashes)),
            "status": "READY_COPY",
        })
    for name, candidates in files.items():
        if name not in referenced_names:
            items.append({"filename": name, "sources": candidates, "status": "ORPHAN"})
    items.extend({
        "report_id": item["report_id"],
        "reference": item["reference"],
        "status": "QUARANTINE_UNSAFE_REFERENCE",
    } for item in malformed)
    items.extend({"source": anomaly["source"], "status": "QUARANTINE_" + anomaly["reason"]} for anomaly in anomalies)
    return {
        "source_roots": [str(root) for root in source_roots],
        "root_status": {str(root): "PRESENT" if root.is_dir() and not root.is_symlink() else "UNAVAILABLE" for root in source_roots},
        "items": items,
        "summary": {
            "report_references": len(references),
            "ready_copy": sum(item.get("status") == "READY_COPY" for item in items),
            "quarantined": sum(str(item.get("status", "")).startswith("QUARANTINE") for item in items),
            "orphans": sum(item.get("status") == "ORPHAN" for item in items),
            "missing_source": sum(item.get("status") == "MISSING_SOURCE" for item in items),
        },
    }


def reconciliation(reports: Iterable[ReportMedia], private_root: Path, changed_ids: Iterable[str] = ()) -> dict:
    rows = [asdict(report) for report in reports]
    states: dict[str, int] = {}
    for row in rows:
        state = row["publication_state"]
        key = state.strip().upper() if isinstance(state, str) and state.strip() else "UNKNOWN"
        states[key] = states.get(key, 0) + 1
    hashes = {}
    if private_root.exists():
        for entry in os.scandir(private_root):
            if not entry.name.startswith(".") and entry.is_file(follow_symlinks=False) and not entry.is_symlink():
                hashes[entry.name] = _file_hash(Path(entry.path))
    public_ids = sorted(row["report_id"] for row in rows if row["publication_state"] in PUBLIC_STATES)
    report_rows = sorted(rows, key=lambda row: row["report_id"])
    return {
        "total_records": len(rows),
        "per_state_counts": states,
        "public_ids": public_ids,
        "changed_ids": sorted(set(changed_ids)),
        "reports_checksum": _json_checksum(report_rows),
        "media_hashes": hashes,
        "media_checksum": _json_checksum(hashes),
    }


def _validate_target(root: Path) -> None:
    try:
        metadata = root.lstat()
    except OSError as exc:
        raise ReconciliationError("Private migration target must exist") from exc
    if (
        stat.S_ISLNK(metadata.st_mode)
        or not stat.S_ISDIR(metadata.st_mode)
        or metadata.st_uid != os.getuid()
        or stat.S_IMODE(metadata.st_mode) != 0o700
        or not os.access(root, os.W_OK | os.X_OK)
    ):
        raise ReconciliationError("Private migration target has unsafe ownership or permissions")


def _write_manifest(path: Path, payload: dict) -> None:
    manifest = {**payload, "integrity_sha256": _json_checksum(payload)}
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_name = tempfile.mkstemp(prefix=".media-manifest-", dir=path.parent)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(manifest, stream, sort_keys=True, indent=2)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except OSError:
            pass
        raise


def apply_migration(
    plan: dict,
    reports: list[ReportMedia],
    private_root: Path,
    manifest_path: Path,
    db_session=None,
) -> dict:
    _validate_target(private_root)
    if manifest_path.exists():
        raise ReconciliationError("Manifest path already exists")
    before = reconciliation(reports, private_root)
    created: list[Path] = []
    changed: list[dict] = []
    staged: list[Path] = []
    try:
        for item in plan["items"]:
            if item.get("status") != "READY_COPY":
                continue
            name = normalize_media_reference(item["filename"])
            destination = private_root / name
            if destination.exists() or destination.is_symlink():
                if destination.is_symlink() or not destination.is_file() or _file_hash(destination) != item["sha256"]:
                    raise ReconciliationError(f"Destination collision for {name}")
                if item["reference_before"] != item["reference_after"]:
                    changed.append({
                        "report_id": item["report_id"], "filename": name,
                        "reference_before": item["reference_before"], "reference_after": item["reference_after"],
                        "publication_state": item["publication_state"], "sha256": item["sha256"],
                        "destination": str(destination), "file_created": False,
                    })
                continue
            source = Path(item["sources"][0]["source"])
            if source.is_symlink() or _file_hash(source) != item["sha256"]:
                raise ReconciliationError(f"Source changed after dry-run for {name}")
            descriptor, temp_name = tempfile.mkstemp(prefix=".media-copy-", dir=private_root)
            temp_path = Path(temp_name)
            staged.append(temp_path)
            os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "wb") as target, source.open("rb") as original:
                shutil.copyfileobj(original, target)
                target.flush()
                os.fsync(target.fileno())
            if _file_hash(temp_path) != item["sha256"]:
                raise ReconciliationError(f"Copied bytes failed checksum for {name}")
            os.link(temp_path, destination, follow_symlinks=False)
            temp_path.unlink()
            staged.remove(temp_path)
            created.append(destination)
            changed.append({
                "report_id": item["report_id"],
                "filename": name,
                "reference_before": item["reference_before"],
                "reference_after": item["reference_after"],
                "publication_state": item["publication_state"],
                "sha256": item["sha256"],
                "destination": str(destination),
                "file_created": True,
            })

        if db_session is not None:
            from apps.api.app.models.entities import CitizenReport
            for item in changed:
                report = db_session.query(CitizenReport).filter(CitizenReport.id == item["report_id"]).with_for_update().first()
                if not report or report.photo_url != item["reference_before"] or report.publication_state != item["publication_state"]:
                    raise ReconciliationError(f"Report changed after dry-run: {item['report_id']}")
                report.photo_url = item["reference_after"]
            db_session.flush()
            report_ids = [report.report_id for report in reports]
            after_rows = [
                ReportMedia(row.id, row.photo_url, row.publication_state)
                for row in db_session.query(CitizenReport.id, CitizenReport.photo_url, CitizenReport.publication_state)
                .filter(CitizenReport.id.in_(report_ids)).all()
            ]
        else:
            after_rows = [
                ReportMedia(row.report_id, next((item["reference_after"] for item in changed if item["report_id"] == row.report_id), row.photo_url), row.publication_state)
                for row in reports
            ]
        after = reconciliation(after_rows, private_root, [item["report_id"] for item in changed])
        if before["total_records"] != after["total_records"] or before["per_state_counts"] != after["per_state_counts"] or before["public_ids"] != after["public_ids"]:
            raise ReconciliationError("Report state reconciliation failed")
        payload = {
            "version": 1,
            "created_files": changed,
            "before": before,
            "after": after,
        }
        _write_manifest(manifest_path, payload)
        if db_session is not None:
            db_session.commit()
        return payload
    except Exception:
        if db_session is not None:
            db_session.rollback()
        manifest_path.unlink(missing_ok=True)
        for path in created:
            try:
                path.unlink()
            except OSError:
                pass
        for path in staged:
            path.unlink(missing_ok=True)
        raise


def rollback_migration(manifest_path: Path, private_root: Path, db_session=None, reports: list[ReportMedia] | None = None) -> dict:
    original_manifest_bytes = manifest_path.read_bytes()
    original_manifest_mode = stat.S_IMODE(manifest_path.stat().st_mode)
    manifest = json.loads(original_manifest_bytes.decode("utf-8"))
    payload = {key: value for key, value in manifest.items() if key != "integrity_sha256"}
    if manifest.get("integrity_sha256") != _json_checksum(payload):
        raise ReconciliationError("Manifest integrity check failed")
    _validate_target(private_root)
    created = payload["created_files"]
    if db_session is not None:
        from apps.api.app.models.entities import CitizenReport
    staged: list[tuple[Path, Path]] = []
    manifest_updated = False
    try:
        if db_session is not None:
            # Lock the records covered by reconciliation until the final commit.
            locked_reports = db_session.query(CitizenReport).with_for_update().all()
            current_reports = [ReportMedia(row.id, row.photo_url, row.publication_state) for row in locked_reports]
        else:
            current_reports = list(reports or [])
        current = reconciliation(current_reports, private_root, payload["after"]["changed_ids"])
        if current != payload["after"]:
            raise ReconciliationError("Current state does not match the migration manifest")

        current_by_id = {report.report_id: report for report in current_reports}
        for item in created:
            report = current_by_id.get(item["report_id"])
            if (
                report is None
                or report.photo_url != item["reference_after"]
                or report.publication_state != item["publication_state"]
            ):
                raise ReconciliationError(f"Report changed after migration: {item['report_id']}")
            if item.get("file_created", True):
                destination = Path(item["destination"])
                if (
                    destination.parent.resolve() != private_root.resolve()
                    or destination.is_symlink()
                    or not destination.is_file()
                    or _file_hash(destination) != item["sha256"]
                ):
                    raise ReconciliationError(f"Refusing to remove changed or unowned media: {item['filename']}")

        for item in created:
            if not item.get("file_created", True):
                continue
            destination = Path(item["destination"])
            fd, staged_name = tempfile.mkstemp(prefix=".media-rollback-", dir=private_root)
            os.close(fd)
            stage = Path(staged_name)
            stage.unlink()
            os.replace(destination, stage)
            staged.append((destination, stage))
        if db_session is not None:
            for item in created:
                report = db_session.query(CitizenReport).filter(CitizenReport.id == item["report_id"]).with_for_update().first()
                if not report:
                    raise ReconciliationError(f"Report disappeared during rollback: {item['report_id']}")
                report.photo_url = item["reference_before"]
            db_session.flush()
            restored_reports = [ReportMedia(row.id, row.photo_url, row.publication_state) for row in locked_reports]
        elif reports is None:
            restored_reports = []
        else:
            restored_reports = [
                ReportMedia(
                    report.report_id,
                    next((item["reference_before"] for item in created if item["report_id"] == report.report_id), report.photo_url),
                    report.publication_state,
                )
                for report in current_reports
            ]
        changed_ids = payload["before"].get("changed_ids", [])
        after = reconciliation(restored_reports, private_root, changed_ids)
        if after != payload["before"]:
            raise ReconciliationError("Rollback reconciliation failed")

        for item in created:
            restored = next((report for report in restored_reports if report.report_id == item["report_id"]), None)
            if restored is None or restored.photo_url != item["reference_before"]:
                raise ReconciliationError(f"Rollback reference reconciliation failed: {item['report_id']}")

        if hashlib.sha256(manifest_path.read_bytes()).digest() != hashlib.sha256(original_manifest_bytes).digest():
            raise ReconciliationError("Manifest changed during rollback")
        payload["rollback_after"] = after
        _write_manifest(manifest_path, payload)
        manifest_updated = True
        if db_session is not None:
            db_session.commit()
        for _, stage in staged:
            try:
                stage.unlink(missing_ok=True)
            except OSError:
                # A hidden, no-follow staging file cannot be served; keep the completed
                # rollback rather than report failure after its database commit.
                pass
        return {"before": payload["after"], "after": after}
    except Exception:
        if db_session is not None:
            db_session.rollback()
        for destination, stage in reversed(staged):
            if stage.exists():
                os.replace(stage, destination)
        if manifest_updated:
            descriptor, temp_name = tempfile.mkstemp(prefix=".media-manifest-restore-", dir=manifest_path.parent)
            try:
                os.fchmod(descriptor, original_manifest_mode)
                with os.fdopen(descriptor, "wb") as stream:
                    stream.write(original_manifest_bytes)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temp_name, manifest_path)
            except Exception:
                try:
                    os.unlink(temp_name)
                except OSError:
                    pass
                raise ReconciliationError("Rollback failed and the original manifest could not be restored")
        raise


def _load_reports(db_session) -> list[ReportMedia]:
    from apps.api.app.models.entities import CitizenReport
    return [
        ReportMedia(row.id, row.photo_url, row.publication_state)
        for row in db_session.query(CitizenReport.id, CitizenReport.photo_url, CitizenReport.publication_state).all()
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Reconcile without writing")
    mode.add_argument("--apply", action="store_true", help="Copy to an isolated test target and normalize references")
    mode.add_argument("--rollback-manifest", type=Path, help="Rollback records listed in a migration manifest")
    parser.add_argument("--source-root", type=Path, action="append", help="Legacy media root; repeat for multiple roots")
    parser.add_argument("--private-root", type=Path)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    from apps.api.app.core.database import SessionLocal
    database_url = str(settings.DATABASE_URL).lower()
    if (args.apply or args.rollback_manifest) and "test" not in database_url:
        parser.error("Apply and rollback require a dedicated test database")
    target_root = args.private_root or settings.PRIVATE_MEDIA_ROOT
    if (args.apply or args.rollback_manifest) and not args.private_root:
        parser.error("Apply and rollback require an explicit isolated --private-root")
    if args.apply and (not args.manifest or not args.source_root):
        parser.error("Apply requires explicit --source-root and --manifest for an isolated copy")
    if (args.apply or args.rollback_manifest) and REPOSITORY_ROOT in target_root.resolve().parents:
        parser.error("Apply and rollback targets must be outside the repository")
    roots = args.source_root or list(DEFAULT_SOURCE_ROOTS)
    with SessionLocal() as db:
        reports = _load_reports(db)
        if args.rollback_manifest:
            result = rollback_migration(args.rollback_manifest, target_root, db, reports)
        else:
            plan = dry_run_report(reports, roots)
            if args.apply:
                result = apply_migration(plan, reports, target_root, args.manifest, db)
            else:
                result = plan
    print(json.dumps(result, sort_keys=True, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
