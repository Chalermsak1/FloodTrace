# P0-1 Pre-Implementation Readiness Review

## Task

`TASK-001 — Ruwaigon Product Transition Audit`

Reviewed unit: `P0-1 — Public Truth Containment`

## Review verdict

`PLAN_REVISION_REQUIRED`

## Inputs reviewed

- User request and repository agent contract
- `docs/EXEC_PLANS/active/TASK-001/plan.md`
- Git branch, status, and current commit
- Active frontend route inventory and P0-1 frontend surfaces
- Public API, forecast, alert, spatial-monitoring, source-access, and source-health code
- Current data inventory and truth/provenance documentation

## Blocking corrections

### REV-001 — Source-health API is outside the authorized P0-1 scope

Severity: `MAJOR`

Expected:
P0-1 must make public source status consistent across the source registry, public provenance response, health response, documentation, and runtime output, as required by its source-status contract and validation T-11.

Actual:
`apps/api/app/main.py` is not listed in the P0-1 files/subsystems. Its public `/health/sources` endpoint hardcodes DWR, DIW, DOPA, and MOPH as production references; invents record counts for DWR, DOPA, and MOPH; and assigns a fixed `2026-01-01` source timestamp to absent DWR/DOPA/MOPH artifacts.

Evidence:
`apps/api/app/main.py:378-405`, `apps/api/app/main.py:419-450`, and `apps/api/app/main.py:459-533`; repository data inventory contains only the boundary, outside-mask, and DIW files plus upload placeholders.

Required correction:
Authorize `apps/api/app/main.py` and focused source-health tests in P0-1. Require `/health/sources` to derive fail-closed statuses and counts from verified runtime/artifact evidence, with no invented counts or timestamps. Add it to P0-1 validation and acceptance.

### REV-002 — Active Data & Methodology route is omitted

Severity: `MAJOR`

Expected:
P0-1 acceptance covers every active rendered surface that presents current source, geometry, or methodology claims.

Actual:
`/data-methodology` is an active public route, but `DataMethodologyPage.tsx` is absent from P0-1 scope and rendered checks. The page states that external data refreshes every 15 minutes, describes local reference datasets as imported system inputs, and presents Sentinel-1 flood extent and river-network geometry as current model inputs.

Evidence:
`apps/web/src/App.tsx:27-40`; `apps/web/src/pages/DataMethodologyPage.tsx:66-136`, `apps/web/src/pages/DataMethodologyPage.tsx:200-229`; P0-1 scope and validation at `plan.md:272` and `plan.md:281-282`.

Required correction:
Authorize `apps/web/src/pages/DataMethodologyPage.tsx`. Require status-aware rendering for `ACTIVE API`, `LOCAL / UNVERIFIED`, `BLOCKED`, and `UNAVAILABLE / UNVERIFIED`, and remove or qualify hardcoded methodology inputs not backed by eligible records. Add `/data-methodology` to missing, blocked, stale, error, and eligible-source rendered checks.

### REV-003 — Current truth documents would remain contradictory

Severity: `MAJOR`

Expected:
Current source-of-truth documentation changed by P0-1 behavior must remain consistent with the source-status contract. Historical audit records remain untouched.

Actual:
P0-1 omits current documents that claim real PCD/RID/GISTDA update cards and connections, production-reference DWR/DIW data, and verified DIW public provenance. These claims conflict with P0-1's required `LOCAL / UNVERIFIED`, `BLOCKED`, and `UNAVAILABLE / UNVERIFIED` classifications.

Evidence:
`docs/HOME_PAGE.md:44-55`, `docs/HOME_PAGE.md:68-74`; `docs/SYSTEM_HEALTH.md:17-21`, `docs/SYSTEM_HEALTH.md:42-44`; `docs/PRIVACY_AND_LEGAL.md:22-26`, `docs/PRIVACY_AND_LEGAL.md:66`; P0-1 document scope at `plan.md:272`.

Required correction:
Authorize and reconcile `docs/HOME_PAGE.md`, `docs/SYSTEM_HEALTH.md`, and `docs/PRIVACY_AND_LEGAL.md` in P0-1. Limit edits to claims changed by this unit. Add these files to the documentation/runtime reconciliation check.

## Scope compliance

No application source, tests, configuration, data, or plan content was modified during review.

## Final decision

P0-1 is not implementation-ready because its authorized scope cannot satisfy its own source-status, active-surface, and documentation reconciliation criteria. Return these corrections to the Planner.
