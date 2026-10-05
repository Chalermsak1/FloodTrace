# TASK-001 — Implementation Record

## Unit and status

**Unit:** P0-1 Public Truth Containment
**Status:** COMPLETE — correction regressions and full backend suite pass. Live verifier/runtime checks confirm fail-closed scheduler/source states. Browser route check remains unverified because the other checkout owns the fixed UI ports.

## Reviewer correction pass — 2026-10-05

### Corrections

- Restored established Thai public status labels, including `NEW` → `รับเรื่องแล้ว`. Unknown status values remain explicitly unavailable.
- `/health/sources` now reports `REAL_EXTERNAL_REQUEST=true` only for active sources with a successful, timezone-aware request start/finish pair inside the scheduler interval. Missing, malformed, stale, or non-active evidence returns `false`.
- The source verifier maps a confirmed disabled scheduler to `BLOCKED`; malformed scheduler state maps to `PARTIAL`. `BLOCKED` and `UNVERIFIED` now also produce a non-zero verifier exit.
- Added regression coverage for public tracking labels, missing/current/stale request evidence, unavailable sources, and disabled scheduler classification.

### Correction validation

- Targeted regressions: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests/test_public_truth_containment.py apps/api/tests/test_scheduler_ownership.py apps/api/tests/test_master_refinement_audit.py::test_section_14_and_15_citizen_report_id_format_and_public_tracking` — **11 passed**, 2 warnings.
- Full backend suite: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests` — **155 passed**, 11 warnings.
- Live source verifier: `RUWAIGON_API_URL=http://127.0.0.1:8002 RUWAIGON_ADMIN_KEY=dev-admin-secret-key-change-in-prod .venv/bin/python scripts/verify_all_sources.py` — `SCHEDULER: BLOCKED`; source health `PARTIAL` due absent telemetry evidence; provenance, metrics, and scheduler contract responses verified; exit 2 as expected for non-passing evidence.
- Live deployment verifier: `RUWAIGON_API_URL=http://127.0.0.1:8002 RUWAIGON_ADMIN_KEY=dev-admin-secret-key-change-in-prod bash deploy/production/verify.sh` — same states and exit 2.
- Verifier unit regression: included in the targeted command above; disabled returns `BLOCKED`, active returns `VERIFIED`, unknown returns `PARTIAL`.
- Frontend build not rerun; this correction pass changed no frontend files.
- `git diff --check` — initial run identified a trailing space on the updated status line in `docs/ADMIN_CONSOLE.md`; removed it and reran the same command — **PASS**, exit 0.

## P0-2 — Citizen Publication Boundary

### Changes

- Added `apps/api/app/core/publication.py` as the shared SQLAlchemy publication allowlist. Only `PUBLIC_SAFE_SUMMARY` is directly eligible; `PUBLIC_VERIFIED` also requires the latest verification row to match current report status and satisfy the P0-1 evidence/method criteria. Missing, malformed, legacy, and unknown values fail closed.
- Applied the shared predicate to public overview and My Area counts, observations, legacy report listing and clustering, all three public risk consumers, and spatial priority inputs. Direct tracking remains a possession-of-code workflow and returns no PII or media reference.
- Moved the existing status-specific verification validator into the shared module so publication and staff transitions use the same criteria.
- Added `scripts/migrate_citizen_publication_boundary.py`. It is read-only and requires `--dry-run`; it proposes `SUPPRESSED` → `WITHHELD`, null/blank/unknown → `PRIVATE`, preserves other recognized states, and reports before/proposed counts, changed IDs, public-eligible IDs, and a SHA-256 manifest. No state was applied.
- Added `apps/api/tests/test_publication_boundary.py` for the state matrix and public, legacy, risk, and spatial consumers. Updated two privacy tests to explicitly mark their sanitization-only fixtures `PUBLIC_SAFE_SUMMARY`, preserving their original DTO assertions under the explicit-publication contract.

### Files changed for P0-2

- `apps/api/app/core/publication.py` (new)
- `apps/api/app/api/public/router.py`
- `apps/api/app/api/v1/admin_reports.py`
- `apps/api/app/api/v1/reports.py`
- `apps/api/app/api/v1/risk.py`
- `apps/api/app/services/spatial_monitoring_service.py`
- `apps/api/tests/test_publication_boundary.py` (new)
- `apps/api/tests/test_governance_security.py`
- `apps/api/tests/test_source_access_and_master.py`
- `scripts/migrate_citizen_publication_boundary.py` (new)
- `docs/EXEC_PLANS/active/TASK-001/implementation.md`

### Validation

- Targeted: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests/test_publication_boundary.py apps/api/tests/test_test_data_isolation_and_regression.py apps/api/tests/test_public_overview.py apps/api/tests/test_public_api_sanitization.py apps/api/tests/test_governance_security.py::test_public_private_data_separation_and_gps_generalization apps/api/tests/test_source_access_and_master.py::test_public_private_boundary_no_pii_or_exact_gps_leakage` — **27 passed**, 1 warning.
- Full backend: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests` — **157 passed**, 11 warnings.
- Migration reconciliation: `DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/python scripts/migrate_citizen_publication_boundary.py --dry-run` — **PASS**, test database only; before/proposed totals both **5**, no changed IDs, one existing public-eligible ID; SHA-256 `2dc749244cc09e27faefc211205f0bec89c5b0606309b19f3292699adb9ea68a`. No migration was applied to any database.
- `git diff --check` — **PASS** after this record update.
- No frontend files changed; no frontend build was needed. `plan.md` and `review.md` were not edited. No commit or push.

## Changes

- Public source, alert, forecast, map, overview, official-update, methodology, and health responses now fail closed where evidence is missing, malformed, or stale. Real zero remains distinct from unavailable. Source status, counts, timestamps, freshness, reason codes, and aggregates derive from application paths and database/artifact evidence.
- Public telemetry values are withheld when their source timestamp is stale or invalid. Provenance no longer supplies a default license or generated update time. Forecast selectors are labeled as application selectors, and forecast data stays unavailable.
- Staff verification normalizes blank fields to null, enforces status-specific evidence and methods, rejects invalid stronger-status transitions/publication, and labels invalid legacy records `LEGACY_UNVALIDATED`. Cross-check waterways remain empty and unavailable; telemetry context carries source timestamps.
- Staff health consumes all three health responses and validates source statuses, records, timestamps, and reconciled counts before showing an operational state.
- Removed authored receptor/tambon/district geometry and fabricated lab/stage pins. Removed static alert notices and no-alert `NORMAL` output. Set systemd to one Uvicorn worker.
- Both verification entrypoints use canonical application responses and the five approved result states. Registry metadata, keys, and direct-only upstream responses cannot certify a source.
- Added P0-1 regression tests and updated affected existing tests. Added current-state notes to the ten named documents; notes explicitly supersede contradictory current claims while retaining historical audits.

## Files changed

- `README.md`
- `apps/api/app/adapters/openmeteo.py`
- `apps/api/app/api/public/router.py`
- `apps/api/app/api/v1/admin_reports.py`
- `apps/api/app/api/v1/alerts.py`
- `apps/api/app/api/v1/forecast.py`
- `apps/api/app/core/provenance.py`
- `apps/api/app/core/source_access.py`
- `apps/api/app/core/system_crosscheck.py`
- `apps/api/app/main.py`
- `apps/api/tests/test_automated_refresh_and_truth.py`
- `apps/api/tests/test_external_real_data_activation.py`
- `apps/api/tests/test_map_monitoring_surface.py`
- `apps/api/tests/test_master_refinement_audit.py`
- `apps/api/tests/test_public_api_sanitization.py`
- `apps/api/tests/test_public_overview.py`
- `apps/api/tests/test_reliability_and_resilience.py`
- `apps/api/tests/test_source_access_and_master.py`
- `apps/api/tests/test_staff_operations_console.py`
- `apps/api/tests/test_timezone_regression_protection.py`
- `apps/api/tests/test_public_truth_containment.py` (new)
- `apps/api/tests/test_staff_truth_containment.py` (new)
- `apps/api/tests/test_scheduler_ownership.py` (new)
- `apps/web/src/components/layout/AppLayout.tsx`
- `apps/web/src/components/map/ContinuousMapView.tsx`
- `apps/web/src/components/map/HomeMapPreview.tsx`
- `apps/web/src/components/map/MapLibreMapView.tsx`
- `apps/web/src/pages/AboutPage.tsx`
- `apps/web/src/pages/AdminReportsPage.tsx`
- `apps/web/src/pages/AreaDetailPage.tsx`
- `apps/web/src/pages/DataMethodologyPage.tsx`
- `apps/web/src/pages/ForecastPage.tsx`
- `apps/web/src/pages/MapPage.tsx`
- `apps/web/src/pages/MyAreaPage.tsx`
- `apps/web/src/pages/OfficialUpdatesPage.tsx`
- `apps/web/src/pages/OverviewPage.tsx`
- `deploy/production/verify.sh`
- `deploy/systemd/floodtrace-api.service`
- `scripts/verify_all_sources.py`
- `docs/ADMIN_CONSOLE.md`
- `docs/CITIZEN_REPORT_VERIFICATION.md`
- `docs/DATA_PROVENANCE.md`
- `docs/DATA_SOURCES.md`
- `docs/HOME_PAGE.md`
- `docs/MAP_VISUALIZATION.md`
- `docs/METHODOLOGY.md`
- `docs/PRIVACY_AND_LEGAL.md`
- `docs/SYSTEM_HEALTH.md`
- `docs/EXEC_PLANS/active/TASK-001/implementation.md` (this record)

`plan.md` and `review.md` were not edited. No commit or push was made.

## Validation evidence

- Declared setup checked: `README.md`, `apps/api/requirements.txt`, `apps/api/app/core/database.py`, `apps/api/tests/conftest.py`, `docker-compose.yml`, `run_dev.sh`, and `apps/web/package.json`. Compose declares PostGIS 16/PostgreSQL 16 at host port 5433; test schema initializes through `reconcile_database_schema`; backend dependencies are in `apps/api/requirements.txt`; `run_dev.sh` starts API 8001 and Vite 5173.
- Existing services: `docker compose ps` showed no services for this checkout. `docker compose up -d db` could not create fixed container name `floodtrace_db`; `docker ps --filter name=^/floodtrace_db$` found its existing healthy container, owned by `/Users/tanawat/Desktop/Projects/FloodTrace/docker-compose.yml`, mapped to host port 5433. No unrelated container was stopped or replaced.
- Test database setup: `docker exec floodtrace_db createdb -U floodtrace_user floodtrace_test_db` — **PASS**. The existing repository-declared PostGIS service now has a dedicated test database. Tests connect with the declared `psycopg2-binary` driver.
- Targeted P0-1 and affected regression tests: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests/test_public_truth_containment.py apps/api/tests/test_staff_truth_containment.py apps/api/tests/test_scheduler_ownership.py apps/api/tests/test_automated_refresh_and_truth.py apps/api/tests/test_external_real_data_activation.py apps/api/tests/test_map_monitoring_surface.py apps/api/tests/test_public_api_sanitization.py apps/api/tests/test_public_overview.py apps/api/tests/test_reliability_and_resilience.py apps/api/tests/test_source_access_and_master.py apps/api/tests/test_timezone_regression_protection.py` — **PASS**, 102 passed, 8 warnings.
- Full backend suite: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests` — **152 passed, 1 failed**, 11 warnings. Remaining failure: `test_section_14_and_15_citizen_report_id_format_and_public_tracking` expects Thai display label `รับเรื่องแล้ว`, but API returns raw status `NEW`; this workflow-label assertion is outside P0-1 truth containment and was not changed.
- Frontend typecheck/build: `npm run build` (from `apps/web`) — **PASS**; TypeScript and Vite production build completed. Vite reports MapLibre chunk exceeds 800 kB.
- Workspace API runtime: `docker exec floodtrace_db createdb -U floodtrace_user floodtrace_p01_runtime` — **PASS**. `DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_p01_runtime ENVIRONMENT=development DATA_ENV=PRODUCTION REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION=true ENABLE_SCHEDULER=false .venv/bin/python -m uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8002` — **PASS startup** on isolated runtime database with scheduler disabled. Local `/api/public/overview` returned unavailable statuses, null timestamps, and real zero report count.
- Source verifier: `RUWAIGON_API_URL=http://127.0.0.1:8002 RUWAIGON_ADMIN_KEY=dev-admin-secret-key-change-in-prod .venv/bin/python scripts/verify_all_sources.py` — emitted only approved states; `PUBLIC_PROVENANCE`, `METRICS`, and `SCHEDULER` were `VERIFIED`; source health was `PARTIAL` because isolated database had no current source records; exit 2.
- Deployment verifier: `RUWAIGON_API_URL=http://127.0.0.1:8002 RUWAIGON_ADMIN_KEY=dev-admin-secret-key-change-in-prod bash deploy/production/verify.sh` — same result and exit 2. No unavailable/unverified source was certified.
- Active-route/browser check: `npm run preview -- --host 127.0.0.1 --port 4174` served the current build locally (HTTP 200; built JavaScript bundle does not contain the observed sample claims). The browser tab at the same URL displayed content from the existing app on a different checkout; host ports 8001/5173 are occupied by containers from `/Users/tanawat/Desktop/Projects/FloodTrace`. Therefore current-workspace rendered route validation remains **UNVERIFIED**. `run_dev.sh` also failed to bind API port 8001 (`Address already in use`); its Vite child was stopped after smoke check.
- Five-state verifier contract: the prior isolated check exercised `VERIFIED`, `UNAVAILABLE`, `BLOCKED`, `UNVERIFIED`, and `PARTIAL`; key-only and direct-upstream-only evidence remained `UNVERIFIED`.
- Python syntax: AST parsing passed for 18 changed/new Python files (`AST_OK 18 Python files`).
- `git diff --check` — **PASS** after the final implementation-record update.
- Focused unsupported-claim scan: remaining map `MODEL` labels are attached only to supplied model features; the remaining missing flood-status fallback was changed from `ปกติ` to `ไม่มีข้อมูล`.

## Deviations and limitations

No scope or plan changes. The earlier full-suite workflow-label failure was the regression corrected in this pass; current full suite passes. Both verifiers correctly report partial source health and a blocked scheduler because the isolated runtime database has no current telemetry evidence and the scheduler is intentionally disabled. Browser route rendering remains unverified because the other checkout owns the fixed UI ports.

## Git state

Branch remains `feature/ruwaigon-redesign`. Working tree contains the P0-1 changes listed above and the pre-existing untracked task scaffold; no unrelated files were changed. No commit or push was made.

## P0-2 reviewer correction — legacy evidence and migration safety

### Corrections

- The exact legacy AdminReports client defaults are now a rejected verification fingerprint: `ตามคำให้การผู้แจ้ง`, `ตรวจสอบภาพถ่ายและพื้นที่`, `ข้อมูลระดับน้ำและฝนในเกณฑ์ปกติ`, `แบบจำลองแสดงความเสี่ยงปานกลาง`, `รอผลตรวจทางเคมี`, and `เก็บตัวอย่างน้ำส่งตรวจเพิ่มเติม`. Shared Python and SQL validation reject any matching field value; the direct tracking route uses the shared validator and reports invalid strong evidence as `LEGACY_UNVALIDATED`.
- Latest verification selection is deterministic by `verified_at DESC, id DESC`. A later invalid record blocks publication even when an earlier valid record exists. A new valid re-review can qualify after legacy substitution.
- Migration CLI now has explicit `--dry-run`, `--apply --manifest PATH`, and `--rollback --manifest PATH` modes. Apply locks records and changes state in one serializable transaction; the manifest records complete before/after counts, state/public-ID checksums, public IDs, changed IDs and states, and an integrity checksum. Rollback validates the manifest and current post-apply snapshot, locks and restores only its changed IDs, then reconciles against the before snapshot. Failed reconciliation aborts the transaction.
- P0-2 correction files: `apps/api/app/core/publication.py`, `apps/api/app/api/public/router.py`, `apps/api/tests/test_publication_boundary.py`, `scripts/migrate_citizen_publication_boundary.py`, and this record. No plan/review or frontend files changed.

### Correction validation

- Targeted P0-2: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests/test_publication_boundary.py apps/api/tests/test_test_data_isolation_and_regression.py apps/api/tests/test_public_overview.py apps/api/tests/test_public_api_sanitization.py apps/api/tests/test_governance_security.py::test_public_private_data_separation_and_gps_generalization apps/api/tests/test_source_access_and_master.py::test_public_private_boundary_no_pii_or_exact_gps_leakage` — **29 passed**, 1 warning.
- Migration dry-run test, transactional apply/manifest rollback, and failure-aborts-transaction tests: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests/test_publication_boundary.py::test_migration_dry_run_apply_and_manifest_rollback apps/api/tests/test_publication_boundary.py::test_apply_reconciliation_failure_rolls_back_transaction` — **2 passed**, 1 warning.
- CLI read-only preview: `DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/python scripts/migrate_citizen_publication_boundary.py --dry-run` — **PASS**, 5 records, zero changes, one public ID; before/after state and public-ID checksums reconcile. Preview manifest checksum: `4eda9a0276fed0d72c12312e83eafd073ad743ec015b172bfcfe49094b64d0ad`.
- CLI isolated execution: seeded three temporary rows in the dedicated `floodtrace_test_db`, ran `--dry-run`, `--apply --manifest <temporary rollback.json>`, then `--rollback --manifest <same file>`, and removed only those test rows — **PASS**; 3 proposals applied, rollback restored the original state checksum. No real/shared database was used and no migration was applied there.
- Full backend: `FLOODTRACE_TEST_DATABASE_URL=postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests` — **159 passed**, 11 warnings.
- `git diff --check` — **PASS** after this correction record update.
- This correction supersedes the earlier P0-2 record that described the then-current migration tool as dry-run-only; P0-1/P0-2 history above is retained.

## P0-3 — Citizen Media Boundary

### Implementation

- Added `Settings.PRIVATE_MEDIA_ROOT`, defaulting to repository `data/private-media`. Private storage requires runtime ownership, exact directory mode `0700`, writable/executable access, and non-symlink directory/file access. Files are created with mode `0600` and exclusive/no-follow opens. Startup and readiness fail closed; upload and delivery return unavailable when storage is unsafe.
- Removed FastAPI static `/uploads` mount and nginx proxy. Nginx explicitly returns `404` for legacy `/uploads/`; SPA fallback does not serve private media. All four Compose variants set `/app/data/private-media` and mount named volume `ruwaigon_private_media` on API only. The API image initializes the volume mountpoint as `0700`.
- Sanitized public and staff uploads now save only in private storage and return the opaque filename. Public list/observation DTOs expose only report-bound media URLs for reports already admitted by the shared P0-2 predicate. Public media access rechecks that predicate and current report state per request, returns `404` for ineligible or missing media, and sets `Cache-Control: no-store`.
- Replaced filename-based staff evidence delivery with `/api/v1/admin/reports/{report_id}/media`. It requires existing staff auth plus `view_reports`, resolves only the report’s stored reference, rejects unsafe names/symlinks, returns no-store bytes, and writes `EVIDENCE_MEDIA_VIEWED` with the resolved staff actor. Staff DTOs return report-bound endpoint references, not storage filenames.
- Staff UI fetches that endpoint with accepted auth headers and displays a temporary object URL. It revokes the URL when report selection changes. Public report upload now targets the private-media upload handler; it never renders a static media URL.
- Added copy-only `scripts/migrate_citizen_media_boundary.py` with read-only dry-run, isolated-test-database apply, integrity-checked rollback manifest, and manifest-driven rollback. It associates one report per file, hashes sources/copies, quarantines unsafe references, collisions, symlinks, and orphans, reconciles total/state/public-ID/changed-ID/checksum data, and restores only references/files recorded by its manifest. CLI apply/rollback require an explicit private target outside the repository and a dedicated test database.
- Updated `docs/ADMIN_CONSOLE.md` to state the implemented private, report-bound, permission-gated, audited staff media behavior.

### P0-3 files changed

- `apps/api/app/core/config.py`
- `apps/api/app/core/private_media.py`
- `apps/api/app/main.py`
- `apps/api/app/api/v1/reports.py`
- `apps/api/app/api/v1/admin_reports.py`
- `apps/api/app/api/public/router.py`
- `apps/api/Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.ssl.yml`
- `deploy/production/docker-compose.prod.yml`
- `deploy/production/docker-compose.prod.ssl.yml`
- `apps/web/nginx.conf`
- `apps/web/src/pages/AdminReportsPage.tsx`
- `apps/api/tests/test_source_access_and_master.py`
- `apps/api/tests/test_public_media_boundary.py`
- `scripts/migrate_citizen_media_boundary.py`
- `docs/ADMIN_CONSOLE.md`
- `docs/EXEC_PLANS/active/TASK-001/implementation.md`

`plan.md` and `review.md` remain unchanged. No commit or push was made.

### P0-3 validation

- Targeted media and sanitizer regressions: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest apps/api/tests/test_public_media_boundary.py apps/api/tests/test_source_access_and_master.py::test_image_metadata_stripped_no_exif_leakage -q` — **PASS**, 9 passed, 2 dependency deprecation warnings. Coverage includes public safe/verified allow, private/withheld/unknown deny, immediate unpublish revocation, static and filename 404s, staff 401/403/404/success and audit, wrong-report path, traversal/symlink rejection, unsafe-root readiness/upload denial, sanitized EXIF-free mode-0600 upload, and migration quarantine/apply/rollback/integrity checks.
- Full backend suite: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest apps/api/tests -q` — **PASS**, 167 passed, 12 dependency deprecation warnings.
- Frontend typecheck/build: `npm run build` from `apps/web` — **PASS**; TypeScript and Vite production build completed. Vite retains its existing large MapLibre chunk warning.
- Legacy-root dry-run only: `PYTHONPATH=. DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/python scripts/migrate_citizen_media_boundary.py --dry-run > /tmp/p03-media-dry-run.json && .venv/bin/python -c 'import json; d=json.load(open("/tmp/p03-media-dry-run.json")); print("dry-run ok", d["summary"], d["root_status"])'` — **PASS**, both legacy roots present; isolated test DB had zero report media references; preview found 10 orphan files and quarantined 2 invalid-name/unreadable entries. No legacy file was changed. No real/shared migration apply was run.
- Isolated migration apply/rollback: `test_migration_apply_and_manifest_rollback_use_isolated_test_database` ran through the targeted pytest command above — **PASS** against the dedicated `floodtrace_test_db` and temporary source/private roots. It copied verified bytes, normalized the test report reference, checked before/after counts, publication states, public IDs and SHA-256, then restored the original reference and removed only the migration-created copy. Rollback restored the before report and media checksums. Dry-run collision/orphan/path-quarantine and manifest-integrity regressions also passed.
- Compose syntax: `docker compose -f docker-compose.yml config --quiet`, `DOMAIN=validation.invalid SECRET_KEY=validation-secret ADMIN_API_KEY=validation-admin-key POSTGRES_PASSWORD=validation-password docker compose -f docker-compose.prod.ssl.yml config --quiet`, `DOMAIN=validation.invalid SECRET_KEY=validation-secret ADMIN_API_KEY=validation-admin-key POSTGRES_PASSWORD=validation-password docker compose -f deploy/production/docker-compose.prod.yml config --quiet`, and `DOMAIN=validation.invalid SECRET_KEY=validation-secret ADMIN_API_KEY=validation-admin-key POSTGRES_PASSWORD=validation-password docker compose -f deploy/production/docker-compose.prod.ssl.yml config --quiet` — **PASS**. Placeholder values were supplied only to validate Compose interpolation.
- API-only media volume and legacy exposure assertion command:

  ```sh
  .venv/bin/python - <<'PY'
  from pathlib import Path
  import yaml
  files = [Path('docker-compose.yml'), Path('docker-compose.prod.ssl.yml'), Path('deploy/production/docker-compose.prod.yml'), Path('deploy/production/docker-compose.prod.ssl.yml')]
  for path in files:
      data = yaml.safe_load(path.read_text())
      api = data['services']['api']
      assert api['environment']['PRIVATE_MEDIA_ROOT'] == '/app/data/private-media'
      assert 'ruwaigon_private_media:/app/data/private-media' in api.get('volumes', [])
      assert data['volumes']['ruwaigon_private_media']['name'] == 'ruwaigon_private_media'
      for name, service in data['services'].items():
          if name != 'api':
              assert not any('ruwaigon_private_media' in str(volume) or '/app/data/private-media' in str(volume) for volume in service.get('volumes', []))
  nginx = Path('apps/web/nginx.conf').read_text()
  assert 'location ^~ /uploads/ {\n        return 404;\n    }' in nginx
  assert 'proxy_pass http://api:8001/uploads/' not in nginx
  assert 'app.mount("/uploads"' not in Path('apps/api/app/main.py').read_text()
  print('PASS: 4 Compose variants, API-only named volume, Nginx /uploads deny, no FastAPI /uploads mount')
  PY
  ```

  Result: **PASS**, all four Compose variants parse, only API mounts the named volume, and legacy static/proxy exposure is absent. TestClient confirmed API `/uploads/*` and legacy filename routes return `404`.
- `git diff --check` — **PASS** after this record update.

### P0-3 deviations and limits

No scope deviation. Real/shared legacy media remained read-only as instructed. Dry-run found only unmatched/quarantined files against the isolated test database; production database association and cutover remain deployment preflight work. No browser session was started because route behavior, auth, revocation, and API 404 boundaries were covered by automated tests and the frontend build.

### P0-3 reviewer correction — legacy sanitization and atomic rollback

- `scripts/migrate_citizen_media_boundary.py` now admits a legacy source to `READY_COPY` only after Pillow verifies and fully decodes it, the decoded JPEG/PNG/WebP format matches its extension, it is a single-frame image, EXIF/GPS metadata is absent, and no unknown/restricted metadata is exposed. Invalid, truncated, mismatched, EXIF/GPS-bearing, or otherwise unprovable files are quarantined; migration does not rewrite or clean source files.
- Rollback now validates the complete live post-migration snapshot against the integrity-checked manifest, stages migration-created files, restores references without committing, and compares the complete before snapshot (record/state counts, public and changed IDs, report checksum, filenames, and media checksums). It writes the updated manifest and commits only after reconciliation succeeds. Any pre-commit failure rolls back the DB transaction, restores staged files, and preserves the original manifest bytes.
- Regression fixtures are generated with Pillow, including real EXIF and GPS-bearing JPEGs. Tests cover clean image eligibility, EXIF, GPS, malformed/truncated bytes, extension/content mismatch, non-image bytes, successful isolated apply/rollback with original checksums, and forced final-reconciliation failure proving DB references, file bytes, and manifest remain at the pre-attempt state.
- Correction files: `scripts/migrate_citizen_media_boundary.py`, `apps/api/tests/test_public_media_boundary.py`, and this implementation record. No frontend, deployment, plan, or review file was changed. Apply/rollback used temporary legacy/private roots and the repository's isolated `floodtrace_test_db`; no real/shared legacy media or database was modified.

#### Correction validation

- Targeted P0-3 media, sanitization, isolated apply/successful rollback, and forced rollback-failure checks: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_public_media_boundary.py` — **PASS**, 15 passed, 2 existing Starlette deprecation warnings. This includes all six generated-image cases, an isolated DB migration apply and successful rollback restoring the original report/media checksums, and a forced final-reconciliation failure proving the database reference, migrated file hash, and manifest bytes were unchanged by the failed rollback attempt.
- Full backend suite: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests` — **PASS**, 174 passed, 12 existing Starlette deprecation warnings.
- `git diff --check` — **PASS**. The correction changes contain no trailing whitespace.

### P0-4A — Public factory and risk route containment

- Removed the factories and risk router imports and public mounts from `apps/api/app/main.py`. The original router modules, analytical services, and internal facility access remain intact.
- Added an unconditional path guard for `/api/v1/factories*` and `/api/v1/risk*`, returning the standard 404 response for every HTTP method. This also prevents the SPA fallback from turning removed POST endpoints into 405 responses. Configuration cannot re-enable the routers.
- Added `apps/api/tests/test_public_route_containment.py`: verifies generated OpenAPI paths omit both router families; legacy collection, detail, screening, hotspot, explain, corridor, source-estimation, area-card, connected-waterway, evidence-packet, and My Area paths (including slash variants) return 404; safe public endpoints do not expose a seeded distinctive facility; and both protected internal facility aliases reject absent/invalid credentials with 401 and accept the configured credential.
- Updated only prior tests that expected the now-removed public factory/risk responses. No analytical module, service, frontend, or deployment file changed; P0-1/P0-2/P0-3 changes remain intact. No commit or push.

#### P0-4A validation

- Targeted containment tests: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_public_route_containment.py` — **PASS**, 26 passed, 1 existing Starlette deprecation warning.
- Updated legacy-route regressions: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_governance_security.py::test_public_source_estimation_route_is_not_mounted apps/api/tests/test_governance_security.py::test_fabricated_fallback_values_impossible apps/api/tests/test_governance_security.py::test_sql_injection_attempts_rejected apps/api/tests/test_source_access_and_master.py::test_public_area_card_route_is_not_mounted apps/api/tests/test_source_access_and_master.py::test_connected_waterway_route_is_not_mounted apps/api/tests/test_source_access_and_master.py::test_evidence_packet_route_is_not_mounted apps/api/tests/test_source_access_and_master.py::test_my_area_risk_route_is_not_mounted apps/api/tests/test_source_access_and_master.py::test_acceptance_test_3_diw_cannot_enter_private_production_without_private_authorization apps/api/tests/test_source_access_and_master.py::test_acceptance_test_7_public_evidence_packet_route_is_not_mounted apps/api/tests/test_source_access_and_master.py::test_acceptance_test_9_public_model_route_is_not_mounted apps/api/tests/test_source_access_and_master.py::test_acceptance_test_10_fail_closed_produces_empty_or_null_instead_of_defaults apps/api/tests/test_audit_integrity.py::test_live_api_endpoints_provenance apps/api/tests/test_publication_boundary.py::test_shared_publication_boundary_filters_every_report_surface` — **PASS**, 13 passed, 1 existing warning.
- Full backend suite: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests` — **PASS**, 200 passed, 12 existing Starlette deprecation warnings.
- `git diff --check` — **PASS**.

### P0-4B + P0-5 — Runtime gate and staff identity containment

- Staff requests now reject query credentials and caller-selected identity/role inputs with `400 INVALID_REQUEST`; accepted `X-Admin-Key` or bearer credentials resolve only the existing active `staff_admin_01` / `admin_user` `ADMIN` database record. Missing/invalid credentials return `401`; missing permission returns `403`. No principal fallback is synthesized. Staff workflow audit actor fields use the resolved server record.
- Protected `POST /api/v1/governance/mode` with `modify_workflow`. The read-only GET now returns only the current mode; it performs no database query and emits no operational counts or invented active-data statement.
- Protected `POST /api/v1/telemetry/sync` with `modify_workflow`. Telemetry GET routes now read persisted rows only; an empty table stays empty and causes no adapter request or database write. Authorized sync remains available.
- The HTTP forecast route does not consume `test_mode`; added regressions prove the response is identical with and without that query parameter across all four `DATA_ENV` / private-gate combinations. No forecast provider or activation behavior changed.
- Removed the console role switcher, spoofable identity headers, hardcoded displayed username, and query-token `EventSource`. The existing assignment workflow remains. Refresh and current request-driven workflows remain available.
- Reconciled the current staff-authentication, role, and connectivity text in `docs/ADMIN_CONSOLE.md`, `docs/SECURITY.md`, and `docs/SYSTEM_HEALTH.md`. They describe the fixed shared principal and do not claim SSO, MFA, per-person identity, or continuous console updates.
- Changed files for this unit: `apps/api/app/api/v1/governance.py`, `apps/api/app/api/v1/telemetry.py`, `apps/api/app/core/security.py`, `apps/api/app/core/staff_rbac.py`, `apps/api/tests/test_p0_security_closure.py`, `apps/api/tests/test_staff_auth_containment.py`, `apps/api/tests/test_staff_operations_console.py`, `apps/api/tests/test_staff_truth_containment.py`, `apps/api/tests/test_master_refinement_audit.py`, `apps/api/tests/test_public_media_boundary.py`, `apps/web/src/pages/AdminReportsPage.tsx`, `docs/ADMIN_CONSOLE.md`, `docs/SECURITY.md`, `docs/SYSTEM_HEALTH.md`, and this record. `plan.md` and `review.md` were not changed.

#### P0 security closure validation

- Targeted P0/security regressions, first grouped run: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_p0_security_closure.py apps/api/tests/test_staff_auth_containment.py apps/api/tests/test_staff_operations_console.py apps/api/tests/test_staff_truth_containment.py apps/api/tests/test_governance_security.py apps/api/tests/test_publication_boundary.py apps/api/tests/test_public_media_boundary.py apps/api/tests/test_public_route_containment.py apps/api/tests/test_public_truth_containment.py apps/api/tests/test_scheduler_ownership.py apps/api/tests/test_automated_refresh_and_truth.py apps/api/tests/test_source_access_and_master.py` — **157 passed, 1 failed**. The failure was `test_acceptance_test_12_production_db_zero_uncredentialed_records`: a preceding scheduler regression in the same pytest process had populated 27 test telemetry rows.
- Failure isolation: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_source_access_and_master.py::test_acceptance_test_12_production_db_zero_uncredentialed_records` — **PASS**, 1 passed.
- Targeted suites rerun with that zero-record assertion before scheduler-populating tests: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_p0_security_closure.py apps/api/tests/test_staff_auth_containment.py apps/api/tests/test_source_access_and_master.py apps/api/tests/test_staff_operations_console.py apps/api/tests/test_staff_truth_containment.py apps/api/tests/test_governance_security.py apps/api/tests/test_publication_boundary.py apps/api/tests/test_public_media_boundary.py apps/api/tests/test_public_route_containment.py apps/api/tests/test_public_truth_containment.py apps/api/tests/test_scheduler_ownership.py apps/api/tests/test_automated_refresh_and_truth.py` — **PASS**, 158 passed, 24 existing deprecation warnings.
- Full backend suite (run once): `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests` — **PASS**, 234 passed, 25 existing deprecation warnings.
- Frontend typecheck/build (run once): `npm run build` in `apps/web` — **PASS**. Vite reported its existing large map bundle advisory; build completed.
- Staff UI and documentation static check:
  ```sh
  python3 - <<'PY'
  from pathlib import Path
  ui = Path('apps/web/src/pages/AdminReportsPage.tsx').read_text()
  for forbidden in ('X-Staff-User', 'X-Staff-Role', 'new EventSource', 'events?token=', 'handleRoleSwitch', 'currentRole', 'currentUsername'):
      assert forbidden not in ui, f'forbidden UI auth pattern remains: {forbidden}'
  assert 'setAssigneeInput' in ui and '/assign' in ui, 'report assignment workflow was removed'
  admin_doc = Path('docs/ADMIN_CONSOLE.md').read_text()
  for forbidden in ('SSE Connected', 'currentRole', 'X-Staff-Role', 'X-Staff-User'):
      assert forbidden not in admin_doc, f'outdated staff claim remains: {forbidden}'
  assert 'shared containment principal' in admin_doc
  print('Staff UI/doc static checks: PASS')
  PY
  ```
  Result: **PASS**.
- `git diff --check` — **PASS** after this record update.
- No scope deviation. The grouped-test ordering interaction was isolated and resolved by running the state-zero assertion before telemetry-populating tests; the full suite also passed. No commit or push.

### P0-5 correction — configured containment principal

- Added `Settings.STAFF_CONTAINMENT_PRINCIPAL_ID` with default `staff_admin_01`. RBAC now looks up only the configured ID; it has no hardcoded ID fallback and no username-based alternate lookup. Blank configuration, missing/unknown records, inactive or non-ADMIN records, renamed/mismatched usernames, and ambiguous matches fail with `401`. A successful principal's audit identity continues to come from the resolved database record.
- Expanded `apps/api/tests/test_staff_auth_containment.py` for the default setting, a separately configured active ADMIN record, missing/unknown/blank settings, inactivity, rename/ID mismatch, non-ADMIN role, duplicate match, and no fallback to the default row. Existing `400 INVALID_REQUEST`, `401 AUTH_ERROR`, and `403 ACCESS_DENIED` regressions remain covered.
- Correction files: `apps/api/app/core/config.py`, `apps/api/app/core/staff_rbac.py`, `apps/api/tests/test_staff_auth_containment.py`, and this implementation record. No frontend files changed; no frontend build was needed. `plan.md` and `review.md` remain unchanged.

#### P0-5 correction validation

- Focused principal/auth tests: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_staff_auth_containment.py` — **PASS**, 25 passed, 11 existing deprecation warnings.
- Targeted security and audit regressions: `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_p0_security_closure.py apps/api/tests/test_staff_truth_containment.py apps/api/tests/test_staff_operations_console.py` — **PASS**, 36 passed, 10 existing deprecation warnings.
- Full backend suite (run once): `PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests` — **PASS**, 239 passed, 25 existing deprecation warnings.
- `git diff --check` — **PASS** after this record update.
- No unrelated code changed. No commit or push.

### P1-A — Prachinburi research intake and human evidence review

Implemented the latest user-approved P1-A handoff as a separate internal workflow. Prior P0 code and task history remain intact. `plan.md` and `review.md` were not edited. No commit or push.

#### Changed files

- `apps/api/app/models/entities.py`: added `ResearchCandidate` and `ResearchCandidateAudit` tables, canonical URL uniqueness, fingerprints/duplicate groups, source/geography/AI/review evidence, resolved reviewer identity and optimistic version. There is no citizen-report or publication association. Verification defaults to `UNVERIFIED`; research endpoints cannot change it.
- `apps/api/app/core/config.py`: added trusted `RESEARCH_RSS_FEEDS: list[str] = []`. Configure permitted feeds through the existing settings environment mechanism using a JSON array. An empty list disables RSS discovery explicitly.
- `apps/api/app/services/research_fetch.py` (new): bounded public text retrieval; HTTP/HTTPS only, public DNS answers only, address pinning with original TLS hostname/certificate checks, redirect revalidation, no credentials/cookies forwarded, text content types only, 256 KiB response limit, 10-second fetch deadline, at most four redirects, and 16,000-character extracted text limit. Scripts, embedded content and media are not fetched/rendered. Text is escaped at presentation and common contact/coordinate/credential patterns are redacted. Unsafe XML declarations/entities, malformed feeds, excessive size and node counts fail closed.
- `apps/api/app/services/research_triage.py` (new): provider interface with an unavailable default; bounded/redacted public text only, strict structured output validation, extractive attributed summaries/claims, source-backed date/location suggestions and no approval/verification/publication authority. Unsupported output, refusal, timeout and unavailable source/provider leave AI fields unavailable. Source instructions are untrusted data.
- `apps/api/app/services/research.py` (new): manual intake, on-demand permitted RSS, canonical idempotency, duplicate grouping, conservative explicit source geography, source-backed locality/event dates, triage and transactional human review/audit. Reviewed evidence cannot be silently re-intaken or AI-triaged. RSS has at most ten feeds, fifty entries per feed and a thirty-second total discovery budget; rejected links/unfinished work return explicit partial/unavailable state. Feed excerpts do not prove article retrieval. Approval requires accessible evidence, supported geography/relationship and explicit resolution of detected privacy/legal issues. Audit and decision commit together; failures roll back both. Audit records are appended, with no mutation endpoint.
- `apps/api/app/api/v1/research.py` (new): only the seven approved endpoint contracts under `/api/v1/admin/research`; signed-off `view_reports` / `triage` / `verify_observation` permissions, strict body/query fields, existing 400/401/403 errors and 409 version conflicts. Source approval means research relevance only.
- `apps/api/app/main.py`: mounted only the versioned staff research router and applied `Cache-Control: no-store` to research responses, including handled errors, missing routes and unexpected server errors.
- `apps/web/src/pages/ResearchInboxPage.tsx` (new): staff sign-in using the existing credential flow, connector availability, URL intake, RSS discovery, keyword/date/area/source/status/geography filters, candidate list/detail, relevance/attributed claims/privacy/group/history views and triage/review actions. Review submits the displayed version; stale updates require reload. Remote text is rendered as React text; no raw HTML, iframe, remote media or legacy media URL. Approval is explicitly separate from verification/publication.
- `apps/web/src/App.tsx`: added `/admin/research` outside the public layout. No public navigation change.
- `apps/api/tests/test_research_intake.py` (new): 92 targeted regressions covering authentication/permissions/extra fields/no-store; URL/DNS/redirect/pinning/bounds/redaction; intake idempotency and review preservation; RSS XML/configuration/deduplication/deadline; valid/refused/malformed/timed-out/unavailable AI and untrusted prompt text; source-backed geography; review decisions/version/identity/audit atomicity; public output isolation and Inbox static safety.
- This implementation record: appended P1-A evidence only.

#### Schema and environment

- Additive tables: `research_candidates`, `research_candidate_audit`; existing tables are unchanged. Uses the repository's existing `reconcile_database_schema()` / `Base.metadata.create_all()` setup. The existing isolated PostgreSQL test database at `127.0.0.1:5433/floodtrace_test_db` created/validated these tables through test setup. No shared/production schema or data migration was run.
- No dependency additions, global tools, authentication redesign, crawler, media ingestion or public analytical route were introduced. Existing `.venv`, pytest, PostgreSQL, React/TypeScript/Vite and declared dependencies were used.

#### Exact validation commands and results

1. Targeted tests first (same command for each correction run):

   ```sh
   PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_research_intake.py
   ```

   Initial run: **87 passed, 3 failed**. Fixed the new Thai location parser (combining marks were excluded by `\w`), changed the new generated-route assertion to OpenAPI paths for the installed FastAPI router representation, and excluded only request-error IDs/timestamps from response comparison. Next run: **89 passed, 1 failed** on a spatial processing timestamp; froze the test clock so all spatial evidence can be compared unchanged. Next run: **90 passed**. Added explicit source-locality and bounded-discovery regressions; **91 passed, 1 failed** because the test patched the shared process clock. Scoped that test clock patch to the research service. Final targeted run: **PASS — 92 passed, 19 deprecation warnings, 4.42 s**. All fixes were confined to P1-A code/tests.

2. Full backend suite, run once after targeted success:

   ```sh
   PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests
   ```

   **PASS — 331 passed, 43 deprecation warnings, 6.74 s**. Existing 239 P0/backend tests remain passing; 92 P1-A tests added. No unrelated failure or fix.

3. Frontend typecheck/build, run once in `apps/web`:

   ```sh
   npm run build
   ```

   **PASS** — TypeScript and Vite build completed; 1,604 modules transformed, Vite build 2.15 s. Existing map bundle size advisory remains; no build failure.

4. Focused Research Inbox static check (also covered in the targeted/full regression suite):

   ```sh
   python3 - <<'PY'
   from pathlib import Path
   page = Path('apps/web/src/pages/ResearchInboxPage.tsx').read_text()
   app = Path('apps/web/src/App.tsx').read_text()
   layout = Path('apps/web/src/components/layout/AppLayout.tsx').read_text()
   assert 'path="/admin/research"' in app
   assert '/admin/research' not in layout
   for forbidden in ('dangerouslySetInnerHTML', '<iframe', '<img', '<video', '/uploads', 'X-Staff-Role', 'X-Staff-User'):
       assert forbidden not in page, forbidden
   for required in ('/api/v1/admin/research', '/api/v1/admin/auth/me', "'X-Admin-Key'", 'expected_version: selected.version', 'source_quote', '{selected.safe_excerpt', 'Permission denied', 'Loading', 'No candidates match', 'UNVERIFIED'):
       assert required in page, required
   print('Research Inbox focused static check: PASS')
   PY
   ```

   **PASS**. API runtime exercised through FastAPI TestClient with the isolated real PostgreSQL database; external source/provider responses used bounded, explicitly generated test fixtures. No live-source health claim is inferred from these tests. No interactive browser session was required by the approved runtime/static alternative.

5. `git diff --check` after this record append — **PASS**.

#### Provider availability and review handoff

- Manual public URL intake: implemented capability `AVAILABLE`; actual attempts retain `ACCESSIBLE` only after successful bounded fetch/extraction, otherwise explicit `UNAVAILABLE` with a reason. Capability availability is not source health or official verification.
- RSS: implemented and tested when server-permitted; unconfigured default reports `UNAVAILABLE / FEEDS_NOT_CONFIGURED`. Articles discovered from a feed remain `UNKNOWN / ARTICLE_NOT_RETRIEVED` until separately retrieved. No background polling/crawling.
- AI triage: provider contract implemented; no external AI adapter is configured/implemented. Default `UNAVAILABLE / PROVIDER_NOT_CONFIGURED`; manual intake/review still works. No OpenAI request or claim of integration. OFFICIAL_WEB, NEWS_WEB, PUBLIC_WEB_SEARCH and SUPPORTED_SOCIAL_API remain `UNAVAILABLE / PROVIDER_NOT_IMPLEMENTED`.
- Limitations are explicit: UTF-8 textual sources only; conservative explicit location/date labels; no automatic geocoding, inferred hydrology, media retrieval, claim verification or publication. Feed/search hints and source claims remain unverified.
- Public isolation regression compares before/after counts, freshness, observations, clusters, public maps/forecast surfaces, removed risk/factory route responses, citizen publication IDs and media denial. It recomputes a reproducible isolated spatial test cell with a fixed clock; research records/reviews do not change the output or citizen rows.
- Reviewer can validate the ten implementation files above plus this appended record against the P1-A handoff. No privacy/legal/architecture decision was missing; no scope deviation or remaining blocker.

### P1-A correction — conflicting geography and private GPS

- `apps/api/app/services/research_fetch.py`: preserved HTML block boundaries and plain-text line breaks in sanitized excerpts so separate province statements remain independently classifiable. Removed blanket redaction of every coordinate pair. Labeled GPS/latitude/longitude/private-coordinate values now redact only when their surrounding statement identifies a reporter, home, personal or private location. Public monitoring/site coordinates remain intact. Redaction replaces exact values with `[PRIVATE_LOCATION_REDACTED]`; the source receives `PRIVATE_LOCATION_REVIEW_REQUIRED`. RSS title/excerpt data uses the same redaction and flagging. Personal coordinate references in submitted URLs are rejected without echoing them. Sanitized reviewer text is also redacted before persistence and audit writes.
- `apps/api/app/services/research_triage.py`: classifies every explicit province/location statement, including repeated labels in one line. Conflicting local and outside statements produce `LOCATION_UNCONFIRMED`; a local assertion requires an explicit location label. Clear local-only and outside-only statements retain their existing classifications.
- `apps/api/app/services/research.py`: retains the structurally separated source excerpt for full-document geography checks. Conflicting evidence cannot be overwritten with `PRACHINBURI_LOCAL` via a review request. Approval still requires source-backed geography and an explicit privacy-resolution note for flagged content. Sanitized review note/rationale/resolution values, rather than submitted raw values, are persisted and audited.
- `apps/api/tests/test_research_intake.py`: added HTML and plain-text province conflict, same-line conflict, blocked-local-approval, local/outside controls, private GPS label variants, manual/RSS persistence and response redaction, AI input exclusion, reviewer-note/audit redaction, and public-site-coordinate preservation tests.
- No frontend, P0, plan or review files changed. No migration or production/shared data action. No commit or push.

#### Correction validation

- Focused location/privacy regressions:

  ```sh
  PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_research_intake.py -k 'gps or private or conflicting or conflict or province'
  ```

  **PASS — 19 passed, 88 deselected, 6 deprecation warnings, 2.60 s**.

- Full targeted P1-A research tests:

  ```sh
  PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_research_intake.py
  ```

  **PASS — 107 passed, 24 deprecation warnings, 3.29 s**.

- Full backend suite (run once after targeted success):

  ```sh
  PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests
  ```

  **PASS — 346 passed, 48 deprecation warnings, 6.94 s**. Warnings are the existing Starlette/httpx deprecations.

- Frontend build: **not run**; correction changed no frontend files.
- `git diff --check` after this correction record update — **PASS**.

### P1-A geographic classification correction

- `apps/api/app/services/research_triage.py`: classify labelled location statements independently, ignore unrelated prose, normalize the supported Prachin Buri spellings, and return `LOCATION_UNCONFIRMED` when local and supported outside-province statements conflict. Province, Location, and Event location labels use consistent local/outside classification.
- `apps/api/app/services/research.py`: use the full sanitized source geography result during review. Conflicts cannot be overridden by choosing a local review classification; unsupported or absent location evidence remains unconfirmed and approval is blocked.
- `apps/api/tests/test_research_intake.py`: added the seven required plain text, HTML, repeated Event location, unrelated-prose, outside-only, and missing-location workflow cases. Each goes through intake, persisted candidate extraction, and review; conflicts and missing/out-of-scope cases cannot be approved.
- No frontend, plan, review, deployment, or P0 files changed. No commit or push.

#### Correction validation

- Focused geographic and location/privacy checks:

  ```sh
  PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_research_intake.py -k 'geography or location_extraction or gps or private or external_context'
  ```

  **PASS — 33 passed, 78 deselected, 15 deprecation warnings, 2.95 s**.

- Full targeted research-intake suite:

  ```sh
  PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests/test_research_intake.py
  ```

  **PASS — 111 passed, 26 deprecation warnings, 3.91 s**.

- Full backend suite:

  ```sh
  PYTHONPATH=. FLOODTRACE_TEST_DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' .venv/bin/pytest -q --tb=short apps/api/tests
  ```

  **PASS — 350 passed, 50 deprecation warnings, 7.87 s**. Warnings are existing Starlette/httpx deprecations.

- Frontend build: **not run**; no frontend files changed.
- `git diff --check` after this record append — **PASS** (exit code 0; no whitespace errors).

### P1-B Ruwaigon product experience and responsive redesign

- Updated the active public experience: `apps/web/index.html`, `apps/web/src/components/layout/AppLayout.tsx`, `apps/web/src/components/map/ContinuousMapView.tsx`, `apps/web/src/components/map/HomeMapPreview.tsx`, `apps/web/src/components/map/MapLibreMapView.tsx`, `apps/web/src/index.css`, and active pages `AboutPage.tsx`, `AdminReportsPage.tsx`, `AreaDetailPage.tsx`, `CasesPage.tsx`, `DataMethodologyPage.tsx`, `ForecastPage.tsx`, `KnowledgePage.tsx`, `MapPage.tsx`, `MyAreaPage.tsx`, `OfficialUpdatesPage.tsx`, `OverviewPage.tsx`, `ReportPage.tsx`, and `ResearchInboxPage.tsx`.
- Added the small shared UI components `apps/web/src/components/ui/PageHeader.tsx`, `EvidenceLabel.tsx`, and `FeedbackState.tsx`.
- Public title/identity now says Ruwaigon and identifies Prachinburi; primary navigation has the five approved destinations, visible reporting access, and no staff links. Evidence family labels use icon and text. Shared pages use compact layouts and explicit loading/unavailable/empty states. The map control buttons now meet the 44px touch target. Empty report subdistrict and water-depth inputs are not filled with invented values.
- No API/backend, `plan.md`, or `review.md` changes. Existing working-tree changes in `apps/web/src/App.tsx` and `apps/web/nginx.conf` belong to signed-off earlier boundaries and were preserved, not changed for P1-B.

#### Build

Command, from `apps/web`:

```sh
npm run build
```

**PASS** — TypeScript and Vite production build completed; 1,607 modules transformed. Vite reported the existing MapLibre vendor chunk above the configured 800 kB warning threshold (1,044.37 kB); build succeeded.

#### Local runtime and browser validation

- Left existing listeners on 8001 and 5173 untouched. Started this checkout’s API on `127.0.0.1:8002` using the isolated local `floodtrace_test_db` on port 5433; API lifespan completed. Started this checkout’s Vite server on `127.0.0.1:5174`. A temporary config in `/private/tmp/p1b-vite.config.mjs` pointed its `/api` proxy to port 8002; it was not added to the repository. The API used the repository’s configured private-media directory; no valid media or report was written.
- Browser-checked 13 routed URLs (`/`, `/overview`, `/map`, `/my-area`, `/cases`, `/report`, `/area-detail?district=ศรีมหาโพธิ`, `/data-methodology`, `/official-updates`, `/forecast`, `/knowledge`, `/about`, `/admin/research`) at **390×844, 768×1024, 1366×768, and 1440×900**: 52 route/viewport checks; zero horizontal overflow, clipped visible controls, missing/duplicate main landmarks, or non-Ruwaigon document titles.
- Navigation and district search: mobile menu exposes the public destinations only; selecting `นาดี` from the home search navigates to `/map?district=นาดี`; mobile menu navigation to Map works and closes the menu.
- Map: MapLibre canvas initialized; layer panel opened and a layer toggled; resize from mobile to tablet resized the canvas to 728px. At 390px, the header and four map control targets measured 44×44px. No map feature geometry was returned for direct marker/cell selection, so only district selection via search was exercised.
- My Area: add, save, remove and local persistence controls exercised; the dialog dismissed with Escape and restored focus. Community filters changed status/category; a generalized report detail dialog fit within the 390×844 viewport, closed with Escape, and restored focus.
- Report: tracking an unknown test ID rendered the API’s not-found response. The report wizard reached review. A malformed `.png` fixture was rejected with the upload fallback. Submission remained blocked because the truthful-observation declaration was unchecked; no report was posted and no valid media was uploaded. The temporary malformed fixture was under `/private/tmp` and removed after checks. The browser may retain the ordinary non-sensitive unsent category/district draft created by the wizard; coordinates and description were not submitted.
- Research Inbox: logged-out route showed the staff access-key gate and no candidate/review actions. No staff credential was available, so authenticated staff actions were not exercised; auth, permissions, and review behavior were not changed.
- Runtime exposed missing/unavailable map/source data using the existing unavailable states. No upstream page or service was opened directly.

#### Final hygiene

- `git diff --check` after this evidence append — **PASS** (exit code 0; no whitespace errors).
- No test fixtures added to the repository. No commit or push.

#### P1-B runtime follow-up

- Runtime commands (test DB password redacted in this record):

  ```sh
  DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' PYTHONPATH=. .venv/bin/uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8002
  ENABLE_SCHEDULER=false DATABASE_URL='postgresql+psycopg2://[REDACTED]@127.0.0.1:5433/floodtrace_test_db' PYTHONPATH=. .venv/bin/uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8002
  ./node_modules/.bin/vite --config /private/tmp/p1b-vite.config.mjs --host 127.0.0.1 --port 5174 --strictPort
  ```

- The first API start used the configured scheduler. Its existing ThaiWater polling received 27 water stations and 77 rainfall stations, added 25 new water observations and 77 rainfall observations, and skipped 2 duplicate water observations in the isolated `floodtrace_test_db`. These were actual upstream records, not fixtures. No report was submitted and no valid media was stored. Records were left intact rather than deleting real observations.
- The rapid 52-route reload pass exceeded the API’s 60-request/minute per-IP limit; some later API reads returned 429. The route/viewport measurements remained usable for width, clipping, landmark, and title checks. Restarted with `ENABLE_SCHEDULER=false` and reran the focused API-backed checks: observations GET returned 200; unknown report tracking returned 404; malformed PNG upload returned 400 from the API; the browser showed the corresponding upload fallback and blocked submission before any report request because the declaration was unchecked. Logged-out Research Inbox displayed only its access-key gate. No candidate/review API call or report POST was made.
- Stopped both local servers after checks and removed the temporary Vite config and malformed image from `/private/tmp`. No valid upload reached the configured private-media root.
- `git diff --check` after this follow-up record — **PASS** (exit code 0; no whitespace errors).

### P1-B My Area district summary correction

- `apps/web/src/pages/MyAreaPage.tsx` now fetches `/api/public/my-area?district=...` once per saved district. It no longer derives saved summaries from `/api/public/zones`; localStorage save/load behavior is preserved.
- Added `apps/web/src/pages/myAreaSummary.ts` for district-response validation and per-district loading, populated, unavailable, and request-error states. It rejects mismatched district responses, displays only response-backed summary values, treats null/blank and explicit unavailable values as unavailable, and preserves a numeric zero count.
- Added `apps/web/tests/myAreaSummary.test.ts` covering populated and zero-count responses, null/unavailable fields, request errors, multiple district queries, response mismatch, query encoding, and absence of a zones dependency.

#### Validation

- Focused frontend tests, from `apps/web`:

  ```sh
  node --experimental-strip-types --test tests/myAreaSummary.test.ts
  ```

  **PASS — 7 passed, 0 failed.**

- Frontend TypeScript and production build, from `apps/web`:

  ```sh
  npm run build
  ```

  **PASS.** Vite completed; its existing MapLibre chunk-size warning remains (1,044.37 kB).

- Local runtime: started the API on `127.0.0.1:8002` against the isolated `floodtrace_test_db` with `ENABLE_SCHEDULER=false`, then started Vite on `127.0.0.1:5174` using a temporary proxy config targeting that API. `/my-area` loaded. Backend logs confirmed per-district GETs to `/api/public/my-area?district=...` returned **200** for both saved districts. The live summary showed a count of **1** for กบินทร์บุรี and preserved **0** for ศรีมหาโพธิ. Stopping the API produced a visible per-district error for both cards while the page and saved-area actions remained usable. The initial async loading state was observed. No report or server data was changed.
- Responsive checks at **390×844, 768×1024, 1366×768, and 1440×900** covered populated summaries and request-error cards. Document widths were **384, 762, 1360, and 1434** respectively (all within their viewports); no clipped headings or summary text were measured. Saved-district remove controls remained **44×44 px**, and detail links remained visible at each size. Test districts were removed afterward, restoring the initially empty local saved-area list. Browser viewport and temporary server/config state were cleaned up.
- `git diff --check` after this correction record — **PASS** (exit code 0; no whitespace errors).

### FINAL QA — Ruwaigon V1 release readiness (2026-10-05)

- **Isolated test database:** inspected `apps/api/tests/conftest.py`; it requires `FLOODTRACE_TEST_DATABASE_URL`, a database name containing `test`, and asserts the connected engine is a test DB before setup. Read-only PostgreSQL identity check confirmed host `127.0.0.1:5433`, database `floodtrace_test_db` (server port `5432`). The local PostGIS service was already running; no shared/production database was used.
- **Targeted My Area regression:** from `apps/web`, `node --experimental-strip-types --test tests/myAreaSummary.test.ts` — **PASS, 7 passed, 0 failed**.
- **Full backend suite:**

  ```sh
  FLOODTRACE_TEST_DATABASE_URL="$(.venv/bin/python -c 'import re; from pathlib import Path; s=Path("docs/EXEC_PLANS/active/TASK-001/implementation.md").read_text(); m=re.search(r"FLOODTRACE_TEST_DATABASE_URL=\x27([^\x27]+)\x27", s); print(m.group(1) if m else "")')" PYTHONPATH=. .venv/bin/pytest -q --tb=short apps/api/tests
  ```

  **PASS — 350 passed, 50 warnings in 6.74s.** Warnings were existing Starlette/httpx deprecations.
- **Frontend build:** `npm --prefix apps/web run build` — **PASS** (TypeScript and Vite; 1,608 modules). Existing non-fatal MapLibre chunk warning: 1,044.37 kB.
- **Active routes:** started this checkout's API at `127.0.0.1:8002` against `floodtrace_test_db` with `ENABLE_SCHEDULER=false` and Vite at `127.0.0.1:5174` with a temporary proxy config. Visited `/`, `/overview`, `/map`, `/my-area`, `/cases`, `/report`, `/area-detail`, `/data-methodology`, `/official-updates`, `/forecast`, `/knowledge`, `/about`, `/admin/research`, and `/admin/reports`; each rendered its app page or expected staff gate/login. `/` redirected to `/overview`. Rapid navigation triggered the configured 60/minute limiter and two handled `CasesPage` unavailable notices; after restarting only this API to clear its in-memory limiter, focused `/cases` loaded successfully with no new console errors. No other checkout's app or listener was used.
- **Functional and responsive checks:** My Area loaded a saved district summary from `/api/public/my-area?district=...`, displayed real zero, and restored the empty localStorage state after removal. Map search selected `นาดี`; risk-surface toggle changed state; public monitoring-priority returned an empty FeatureCollection without geometry. Cases displayed generalized area only. Report tracking stayed disabled without an ID; the unsubmitted wizard did not allow progression past location without a location. Map and report were checked at **390×844, 768×1024, 1366×768, 1440×900**; no horizontal overflow or clipped controls/text were observed. The prior focused My Area correction checks also covered populated and request-error cards at these four sizes, with 44×44 remove controls. No report was submitted and no upload sent.
- **Security/privacy:** logged-out Research Intake showed its staff gate and no candidate data. Read-only requests with the existing configured staff key returned 200 for `/api/v1/admin/auth/me`, `/api/v1/admin/research/connectors`, and `/api/v1/admin/research/candidates` (0 candidates). Connector states were `MANUAL_PUBLIC_URL:AVAILABLE`; `RSS`, `OFFICIAL_WEB`, `NEWS_WEB`, `PUBLIC_WEB_SEARCH`, and `SUPPORTED_SOCIAL_API` unavailable; permitted feed count 0. No intake/review mutation was made. Full backend suite, including public route containment, publication, media, sanitization, and staff authorization tests, passed. No private GPS, reporter identity, or restricted facility data was requested or exposed in checked public pages.
- **Config/artifact checks:** targeted scan of `deploy/production`, `deploy/systemd`, `apps/web/vite.config.ts`, and runtime config found no temporary QA ports/paths, public `/uploads`, or test-bypass tokens. `test_secrets_not_committed` passed in the backend suite. Temporary Vite config was removed; API and Vite sessions were stopped; browser test viewport was reset. The route-burst 429s were transient QA pacing effects and did not reproduce after the API limiter reset.
- **Documentation:** corrected stale README wording about active analytics/satellite API integration and updated its backend test badge to 350/350; aligned `docs/HOME_PAGE.md` title, product name, and scope with Ruwaigon public identity and FloodTrace internal identity.
- **Git hygiene:** branch remained `feature/ruwaigon-redesign`; no commit or push was made. Existing approved uncommitted implementation files were preserved. Final `git diff --check` — **PASS** (exit code 0).
