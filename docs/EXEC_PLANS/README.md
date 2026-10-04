# Execution Plans

`EXEC_PLANS` keeps substantial engineering work traceable without replacing existing
architecture, security, privacy, GIS, data, audit, or testing documentation.
Each task reads only the existing sources of truth relevant to its scope.

## Roles and ownership

- Planner owns `plan.md` and defines evidence-based scope, steps, validation, and acceptance criteria.
- Implementer follows the approved plan and owns `implementation.md`.
- Reviewer independently validates the request, plan, implementation record, diff, tests, and runtime evidence, then owns `review.md`.

No role edits another role's artifact. Reviewer does not repair source code during review.

## Task lifecycle

1. Create `active/TASK-XXX-short-slug/` from the three templates.
2. Planner writes and obtains approval for `plan.md`.
3. Implementer makes scoped changes and records evidence in `implementation.md`.
4. Reviewer records `PASS`, `FAIL`, or `PLAN_REVISION_REQUIRED` in `review.md`.
5. On `FAIL`, Implementer corrects the implementation and Reviewer checks again.
6. On `PLAN_REVISION_REQUIRED`, Planner revises the plan before implementation resumes.
7. After `PASS`, move the whole task directory from `active/` to `completed/`.

Plans are task-scoped contracts. They do not override repository sources of truth.
See the root [AGENTS.md](../../AGENTS.md) for role rules, invariants, and documentation routing.
