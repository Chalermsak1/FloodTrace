#!/usr/bin/env python3
"""Reconcile legacy citizen publication states with transactional manifest safety."""

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path

from apps.api.app.core.database import SessionLocal, engine
from apps.api.app.core.publication import public_report_predicate
from apps.api.app.models.entities import CitizenReport


MANIFEST_VERSION = 1
MANIFEST_KIND = "RUWAIGON_P0_2_PUBLICATION_STATE_MIGRATION"
PUBLIC_STATES = {"PUBLIC_SAFE_SUMMARY", "PUBLIC_VERIFIED"}
RECOGNIZED_STATES = PUBLIC_STATES | {"PRIVATE", "WITHHELD", "SUPPRESSED"}


class ReconciliationError(RuntimeError):
    pass


def proposed_state(raw_state):
    if raw_state == "SUPPRESSED":
        return "WITHHELD"
    if raw_state in {"PRIVATE", "PUBLIC_SAFE_SUMMARY", "PUBLIC_VERIFIED", "WITHHELD"}:
        return raw_state
    return "PRIVATE"


def _canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256(value):
    return hashlib.sha256(_canonical_bytes(value)).hexdigest()


def _state_key(value):
    return value if isinstance(value, str) and value.strip() else "<NULL_OR_BLANK>"


def _snapshot_from_records(records, public_ids):
    ordered = sorted((tuple(row) for row in records), key=lambda row: row[0])
    public_ids = sorted(public_ids)
    counts = {}
    for _, state in ordered:
        key = _state_key(state)
        counts[key] = counts.get(key, 0) + 1
    return {
        "total_records": len(ordered),
        "per_state_counts": dict(sorted(counts.items())),
        "public_ids": public_ids,
        "state_checksum": _sha256(ordered),
        "public_ids_checksum": _sha256(public_ids),
    }


def reconcile(db):
    records = db.query(CitizenReport.id, CitizenReport.publication_state).order_by(CitizenReport.id).all()
    public_ids = [
        row[0] for row in db.query(CitizenReport.id)
        .filter(public_report_predicate())
        .order_by(CitizenReport.id)
        .all()
    ]
    return _snapshot_from_records(records, public_ids), records


def _manifest_checksum(manifest):
    content = {key: value for key, value in manifest.items() if key != "manifest_sha256"}
    return _sha256(content)


def _seal_manifest(manifest):
    manifest["manifest_sha256"] = _manifest_checksum(manifest)
    return manifest


def _validate_snapshot(snapshot):
    if not isinstance(snapshot, dict):
        raise ReconciliationError("manifest snapshot is malformed")
    if snapshot.get("total_records") != sum(snapshot.get("per_state_counts", {}).values()):
        raise ReconciliationError("manifest snapshot state counts do not reconcile")
    public_ids = snapshot.get("public_ids")
    if not isinstance(public_ids, list) or public_ids != sorted(set(public_ids)):
        raise ReconciliationError("manifest public IDs are malformed")
    if snapshot.get("public_ids_checksum") != _sha256(public_ids):
        raise ReconciliationError("manifest public ID checksum mismatch")
    for key in ("state_checksum", "public_ids_checksum"):
        value = snapshot.get(key)
        if not isinstance(value, str) or len(value) != 64:
            raise ReconciliationError(f"manifest {key} is malformed")


def validate_manifest(manifest):
    if not isinstance(manifest, dict) or manifest.get("version") != MANIFEST_VERSION or manifest.get("kind") != MANIFEST_KIND:
        raise ReconciliationError("unsupported migration manifest")
    if manifest.get("manifest_sha256") != _manifest_checksum(manifest):
        raise ReconciliationError("manifest checksum mismatch")
    before, after = manifest.get("before"), manifest.get("after")
    _validate_snapshot(before)
    _validate_snapshot(after)
    changes = manifest.get("changes")
    if not isinstance(changes, list):
        raise ReconciliationError("manifest changes are malformed")
    ids = [item.get("report_id") for item in changes if isinstance(item, dict)]
    if len(ids) != len(changes) or ids != sorted(set(ids)):
        raise ReconciliationError("manifest changed IDs are malformed")
    for item in changes:
        if item.get("after_state") != proposed_state(item.get("before_state")):
            raise ReconciliationError("manifest contains an invalid state transition")
        if item.get("before_state") in PUBLIC_STATES and item.get("after_state") not in PUBLIC_STATES:
            raise ReconciliationError("manifest attempts an invalid publication transition")
        if item.get("before_state") not in PUBLIC_STATES and item.get("after_state") in PUBLIC_STATES:
            raise ReconciliationError("manifest would promote a report")
    if before["total_records"] != after["total_records"]:
        raise ReconciliationError("manifest total record counts differ")
    if before["public_ids"] != after["public_ids"]:
        raise ReconciliationError("manifest changes public eligibility")
    if len(ids) != manifest.get("changed_count"):
        raise ReconciliationError("manifest changed count does not reconcile")


def dry_run_report(db):
    before, records = reconcile(db)
    proposed_records = [(report_id, proposed_state(state)) for report_id, state in records]
    changes = [
        {"report_id": report_id, "before_state": state, "after_state": proposed_state(state)}
        for report_id, state in records
        if proposed_state(state) != state
    ]
    after = _snapshot_from_records(proposed_records, before["public_ids"])
    manifest = _seal_manifest({
        "version": MANIFEST_VERSION,
        "kind": MANIFEST_KIND,
        "mode": "DRY_RUN",
        "before": before,
        "after": after,
        "changes": changes,
        "changed_count": len(changes),
    })
    validate_manifest(manifest)
    return manifest


def _write_manifest_exclusive(path, manifest):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temp = Path(temp_name)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(_canonical_bytes(manifest) + b"\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temp, path)
        return path
    finally:
        temp.unlink(missing_ok=True)


def _set_serializable(db):
    if "postgresql" in str(engine.url):
        db.connection().exec_driver_sql("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")


def apply_migration(db, manifest_path):
    path = Path(manifest_path)
    if path.exists():
        raise ReconciliationError("refusing to overwrite an existing manifest")
    wrote_manifest = False
    try:
        with db.begin():
            _set_serializable(db)
            records = db.query(CitizenReport.id, CitizenReport.publication_state).order_by(CitizenReport.id).with_for_update().all()
            before_public_ids = [
                row[0] for row in db.query(CitizenReport.id)
                .filter(public_report_predicate())
                .order_by(CitizenReport.id)
                .all()
            ]
            before = _snapshot_from_records(records, before_public_ids)
            changes = []
            for report_id, old_state in records:
                new_state = proposed_state(old_state)
                if new_state == old_state:
                    continue
                if old_state not in PUBLIC_STATES and new_state in PUBLIC_STATES:
                    raise ReconciliationError(f"refusing to promote report {report_id}")
                db.query(CitizenReport).filter(CitizenReport.id == report_id).update(
                    {CitizenReport.publication_state: new_state}, synchronize_session=False
                )
                changes.append({"report_id": report_id, "before_state": old_state, "after_state": new_state})
            db.flush()
            after, _ = reconcile(db)
            expected_records = [(report_id, proposed_state(state)) for report_id, state in records]
            expected_after = _snapshot_from_records(expected_records, before_public_ids)
            if after != expected_after:
                raise ReconciliationError("post-apply reconciliation mismatch")
            if after["total_records"] != before["total_records"] or after["public_ids"] != before["public_ids"]:
                raise ReconciliationError("migration changed totals or public eligibility")
            changes.sort(key=lambda item: item["report_id"])
            manifest = _seal_manifest({
                "version": MANIFEST_VERSION,
                "kind": MANIFEST_KIND,
                "mode": "APPLIED",
                "before": before,
                "after": after,
                "changes": changes,
                "changed_count": len(changes),
            })
            validate_manifest(manifest)
            _write_manifest_exclusive(path, manifest)
            wrote_manifest = True
    except Exception:
        if wrote_manifest:
            path.unlink(missing_ok=True)
        raise
    return manifest


def rollback_migration(db, manifest_path):
    try:
        manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReconciliationError("cannot read migration manifest") from exc
    validate_manifest(manifest)
    if manifest.get("mode") != "APPLIED":
        raise ReconciliationError("rollback requires an applied migration manifest")

    with db.begin():
        _set_serializable(db)
        current, records = reconcile(db)
        if current != manifest["after"]:
            raise ReconciliationError("database no longer matches the applied manifest")
        for item in manifest["changes"]:
            report_id = item["report_id"]
            row = db.query(CitizenReport.publication_state).filter(
                CitizenReport.id == report_id
            ).with_for_update().first()
            if not row or row[0] != item["after_state"]:
                raise ReconciliationError(f"report {report_id} changed after migration; rollback aborted")
        for item in manifest["changes"]:
            db.query(CitizenReport).filter(CitizenReport.id == item["report_id"]).update(
                {CitizenReport.publication_state: item["before_state"]}, synchronize_session=False
            )
        db.flush()
        after, _ = reconcile(db)
        if after != manifest["before"]:
            raise ReconciliationError("post-rollback reconciliation mismatch")
    return {
        "mode": "ROLLED_BACK",
        "manifest_sha256": manifest["manifest_sha256"],
        "changed_ids": [item["report_id"] for item in manifest["changes"]],
        "before": current,
        "after": after,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="print a read-only reconciliation preview")
    mode.add_argument("--apply", action="store_true", help="apply changes transactionally and write a rollback manifest")
    mode.add_argument("--rollback", action="store_true", help="restore only changes in an applied manifest")
    parser.add_argument("--manifest", help="manifest output path for --apply; input path for --rollback")
    args = parser.parse_args(argv)
    if args.apply and not args.manifest:
        parser.error("--apply requires --manifest")
    if args.rollback and not args.manifest:
        parser.error("--rollback requires --manifest")

    with SessionLocal() as db:
        if args.dry_run:
            if "postgresql" in str(engine.url):
                db.connection().exec_driver_sql("SET TRANSACTION READ ONLY")
            result = dry_run_report(db)
        elif args.apply:
            result = apply_migration(db, args.manifest)
        else:
            result = rollback_migration(db, args.manifest)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
