---
id: T-0135
title: Scaffold the API project with a read-only query layer and AIP errors
component: data
kind: feature
agent: data-implementer
paths:
  - apps/api/.gitignore
  - apps/api/.python-version
  - apps/api/pyproject.toml
  - apps/api/uv.lock
  - apps/api/src/soccer_cards_api/__init__.py
  - apps/api/src/soccer_cards_api/queries.py
  - apps/api/src/soccer_cards_api/errors.py
  - apps/api/tests/__init__.py
  - apps/api/tests/fakes.py
  - apps/api/tests/test_queries.py
  - apps/api/tests/test_errors.py
dependencies:
  - fastapi
  - pytest
  - pytest-cov
  - mypy
  - ruff
  - bandit
max_changed_lines: 400
status: ready
---

## Goal

The first half of the ADR 0008 spike: the `apps/api` project with its gates,
the read-only query layer every route will use, and the one AIP-193 error
shape. The route, the Worker and D1 are T-0136.

## Context

- ADR 0005 and ADR 0008 (D3, D4, D10). The first build of the whole spike was
  646 lines, over the 400 limit, so it is split; a first build exists on
  `feat/T-0135-spike-fastapi-worker-reading-d1` (commit b0b8170). Take this
  task's files from it.
- The gates match `data/pipeline`: ruff, mypy strict, bandit, pytest with
  `pytest-cov` and a 90% branch coverage floor. `make check COMPONENT=data`
  runs them once `apps/api/pyproject.toml` exists.
- Python 3.13, the Workers runtime's version.

## Acceptance criteria

- `apps/api` is a `uv` project with a `src` layout whose gates pass under
  `make check COMPONENT=data`.
- The query layer has no write method: it runs only a single `SELECT` with
  bound parameters, and refuses anything else.
- One AIP-193 error body,
  `{"error": {"code": ..., "message": "...", "status": "..."}}`, for 400, 404
  and 500, with no internal detail in a 500's message.

## Edge cases

- `INSERT`, `UPDATE`, `DELETE`, `DROP`, a stacked statement, `WITH ... DELETE`
  and an empty string are refused.
- An injection string is bound as a parameter, never interpolated.

## Tests

- `test_queries.py` and `test_errors.py` with an in-memory fake of the D1
  binding (`fakes.py`).

## Out of scope

- The FastAPI app, routes, the Worker entry point, `wrangler.jsonc` and the D1
  migration (T-0136).
