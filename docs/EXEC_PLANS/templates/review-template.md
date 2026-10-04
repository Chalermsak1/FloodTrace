# Independent Review

## Task

`TASK-XXX — <Title>`

## Review verdict

<Choose exactly one: `PASS`, `FAIL`, or `PLAN_REVISION_REQUIRED`>

`PASS` is not allowed when a mandatory acceptance criterion is `NOT_VERIFIED`.

## Inputs reviewed

- User request
- `plan.md`
- `implementation.md`
- Git diff
- Relevant tests
- Runtime evidence

## Acceptance criteria

- AC-01 — <`PASS`, `FAIL`, or `NOT_VERIFIED`>: <evidence>
- AC-02 — <`PASS`, `FAIL`, or `NOT_VERIFIED`>: <evidence>

## Findings

### REV-001 — <Finding title>

Severity: <`CRITICAL`, `MAJOR`, or `MINOR`>

Expected:
<Required behavior or plan condition.>

Actual:
<Observed behavior.>

Evidence:
<File, line, command, test, or runtime observation.>

Required correction:
<Specific correction, or `None` when documenting a non-blocking observation.>

## Scope compliance

<Confirm changed files and behavior remain within approved scope.>

## Regression review

<Relevant regression checks and results.>

## Security/privacy review

<Relevant controls and evidence, or `Not applicable` with reason.>

## Data-integrity review

<Relevant truth, provenance, missing-data, and classification checks.>

## Runtime/UI review

<Observed behavior and evidence, or `Not applicable` with reason.>

## Remaining uncertainty

- <Unverified item and impact, or `None`>

## Final decision

<Verdict rationale. Route `FAIL` to Implementer and `PLAN_REVISION_REQUIRED` to Planner.>
