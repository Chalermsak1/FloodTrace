# Ruwaigon Engineering Agent Contract

## Project identity

Ruwaigon is the public-facing product name for this repository.
Internal technical identifiers such as `FloodTrace` may remain unchanged.
Do not rename internal identifiers for branding unless an approved task plan requires it.

This file routes engineering work. It does not replace project documentation.
Existing source-of-truth documents take precedence over assumptions in prompts.
Read only the documents relevant to the current task.

## Documentation router

- [README.md](README.md): overall architecture, project state, setup, and testing.
- [docs/MAP_VISUALIZATION.md](docs/MAP_VISUALIZATION.md): GIS and map visualization architecture.
- [docs/METHODOLOGY.md](docs/METHODOLOGY.md): scientific and analytical methodology.
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md): data catalog and source status.
- [docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md): data lineage and provenance.
- [docs/PRIVACY_AND_LEGAL.md](docs/PRIVACY_AND_LEGAL.md): privacy and legal constraints.
- [docs/SECURITY.md](docs/SECURITY.md): security architecture and runbooks.
- [docs/CITIZEN_REPORT_WORKFLOW.md](docs/CITIZEN_REPORT_WORKFLOW.md): public report workflow.
- [docs/AUDIT/](docs/AUDIT/): audit and readiness evidence.
- [apps/api/tests/](apps/api/tests/): backend verification.
- [scripts/](scripts/): operational and verification tools.

Inspect a verification script before treating it as authoritative.
Some scripts contain machine-specific paths, legacy branding, or environment assumptions.

## Non-negotiable invariants

1. Use real data only.
2. Never fabricate environmental measurements.
3. Never fabricate laboratory results.
4. Never fabricate GIS geometry.
5. Never fabricate government or official information.
6. Keep missing data explicitly missing.
7. Never present modeled output as laboratory confirmation.
8. Never present forecast output as current observed reality.
9. Never treat spatial or hydrological connectivity as legal causation.
10. Never present citizen observations as official confirmation.
11. Public interfaces must not expose restricted facility or source identity.
12. Protect reporter PII and exact private GPS coordinates.
13. Preserve public/private API sanitization boundaries.
14. Do not silently broaden task scope.
15. Do not silently reinterpret user requirements.
16. Do not change architecture merely to simplify visual output.
17. Follow repository source-of-truth documentation over prompt assumptions.

## Three-role workflow

Substantial engineering tasks use exactly three roles:

1. Planner
2. Implementer
3. Reviewer

Each role owns one task artifact. Do not cross ownership boundaries.

### Planner

Purpose: inspect the request and repository, then produce an executable plan.

The Planner may inspect code, documentation, history, diffs, tests, and dependencies, and run non-mutating discovery commands.
The Planner defines scope, risks, validation, and acceptance criteria, and owns only `plan.md` among task artifacts.

The Planner must describe current repository behavior before proposing changes.
The Planner must make the plan implementation-ready and evidence-based.
The Planner must not implement features, fix bugs, alter tests, or install dependencies.
The Planner must not edit `implementation.md` or `review.md`.

### Implementer

Purpose: execute the approved `plan.md` within its stated scope.

The Implementer must read this file, `plan.md`, and relevant source-of-truth documents, and may change only plan-authorized files.
The Implementer may run targeted tests, builds, and runtime checks.
The Implementer owns `implementation.md`.

The Implementer must not edit `plan.md` or redefine acceptance criteria.
The Implementer must not expand scope, fabricate missing data, or weaken tests.
The Implementer must preserve security, privacy, and sanitization constraints.
The Implementer must record files changed, commands, results, deviations, and blockers.
The Implementer must not claim completion without fresh verification.

### Reviewer

Purpose: independently validate implementation against the request and approved plan.

The Reviewer compares the user request, `plan.md`, `implementation.md`, Git diff, runtime behavior, and relevant tests.
The Reviewer owns `review.md` and performs review and validation only.
The Reviewer must not edit source code, `plan.md`, or implementation records.
The Reviewer must not lower acceptance criteria or overlook scope violations.

The review verdict must be exactly one of:

- `PASS`: all mandatory acceptance criteria pass.
- `FAIL`: implementation is incomplete or incorrect, but the plan remains valid.
- `PLAN_REVISION_REQUIRED`: the plan conflicts with requirements or repository reality.

`PASS` is forbidden when any mandatory acceptance criterion is `NOT_VERIFIED`.

## Task directories and identifiers

Create substantial task records under `docs/EXEC_PLANS/active/<task-id>/`.
Use sequential IDs with short slugs, such as `TASK-001-map-redesign`.
Do not encode dates or model names in task IDs.

Each task directory contains:

- `plan.md`
- `implementation.md`
- `review.md`

Start from templates in `docs/EXEC_PLANS/templates/`.
After Reviewer `PASS`, the whole task directory may move to `docs/EXEC_PLANS/completed/`.

## Correction loop

Planner writes `plan.md`; Implementer produces scoped changes and `implementation.md`;
Reviewer verifies evidence and writes `review.md`.

- `PASS`: task is complete and may move to `completed/`.
- `FAIL`: return findings to Implementer, then review the correction again.
- `PLAN_REVISION_REQUIRED`: return to Planner, then implement and review the revision.

Reviewer findings never authorize Reviewer source edits.

## Scope and validation discipline

Treat the approved plan as the task contract.
Stop and escalate when requirements conflict, scope is unclear, or evidence is missing.
Do not modify unrelated files or discard unrelated user changes.

Use targeted verification first:

- Frontend: relevant UI/runtime checks and frontend build.
- Map: map-specific tests, rendered inspection, build, and relevant privacy checks.
- Backend: targeted pytest and API verification.
- Security: relevant security and sanitization checks.

Do not run every production audit for every small task.
Record commands and exact results in `implementation.md` and `review.md`.

## Git safety

Inspect Git status before editing.
Do not work directly on `main` for substantial changes.
Never force-push or rewrite upstream history.
Never discard unrelated user changes.
Keep changes within approved scope.
Do not assume `origin` or `upstream` ownership; inspect remotes first.
Do not commit unless the user explicitly requests it.

## Escalation

Escalate to the user when required access, data, credentials, or decisions are missing.
Escalate to Planner when repository evidence invalidates the plan.
Report blockers and uncertainty explicitly; never invent a convenient substitute.
