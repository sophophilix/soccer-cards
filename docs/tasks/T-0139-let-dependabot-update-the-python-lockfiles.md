---
id: T-0139
title: Let Dependabot update the Python lockfiles past the fixed uv cut-off
component: data
kind: fix
agent: data-implementer
paths:
  - apps/api/pyproject.toml
  - apps/api/uv.lock
  - apps/api/tests/test_project.py
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
  - data/pipeline/tests/test_project.py
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

Dependabot's uv update for `/apps/api` failed on 2026-11-21 (run
44918721963). Both `pyproject.toml` files set
`exclude-newer = "2026-11-07T00:00:00Z"`, a fixed date. Dependabot proposed
FastAPI 0.162.1, which was published at 11:56Z that day, and uv refused it.
A fixed cut-off blocks every update after that date. The two-week rule
(ADR 0004, `python-standards`) is already enforced by Dependabot's 14-day
cooldown in `.github/dependabot.yml`.

## Context

- `apps/api/pyproject.toml` line 16 and `data/pipeline/pyproject.toml`
  line 23.
- `.github/dependabot.yml`: both uv entries have `cooldown.default-days: 14`.
- uv's documentation for `exclude-newer`. Check whether the installed uv
  and the uv in Dependabot accept a relative duration, such as `"14 days"`
  or `"P14D"`. Say which version you checked.
- Merge T-0136 first. It also changes `apps/api/pyproject.toml`.

## Acceptance criteria

- Either `exclude-newer` is a relative 14-day window that uv and Dependabot
  both accept, or, if one of them doesn't, it is removed and the 14-day
  rule rests on Dependabot's cooldown. The report says which and why.
- A test in each project's `test_project.py` checks the setting (relative
  window, or absent), so a fixed date can't come back unnoticed.
- `uv lock --check` passes in both projects. The lockfiles change only if
  uv rewrites them.
- `make check COMPONENT=data` passes.

## Edge cases

- uv records `exclude-newer` in `uv.lock`. A relative window must not make
  `uv lock --check` fail from one day to the next.

## Tests

- `apps/api/tests/test_project.py` and `data/pipeline/tests/test_project.py`.

## Out of scope

- `.github/dependabot.yml`, upgrading any package, and the T-0136 work.
