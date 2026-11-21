---
id: T-0136
title: Answer GET /api/v2/players/{player} from D1 on a Python Worker
component: data
kind: feature
agent: data-implementer
paths:
  - apps/api/pyproject.toml
  - apps/api/uv.lock
  - apps/api/.gitignore
  - apps/api/src/soccer_cards_api/errors.py
  - apps/api/tests/test_errors.py
  - apps/api/src/soccer_cards_api/app.py
  - apps/api/src/soccer_cards_api/players.py
  - apps/api/src/worker.py
  - apps/api/wrangler.jsonc
  - apps/api/migrations/**
  - apps/api/tests/conftest.py
  - apps/api/tests/test_players.py
dependencies:
  - workers-py
  - httpx
max_changed_lines: 400
status: ready
---

## Goal

The second half of the ADR 0008 spike: one route, answered by FastAPI on a
Cloudflare Python Worker from a local D1 table, and run for real on the
Workers runtime, to prove the parts fit before the rest of the API is built.

## Context

- Merge T-0135 first; this uses its query layer and errors.
- A first build exists on `feat/T-0135-spike-fastapi-worker-reading-d1`
  (commit b0b8170). Take this task's files from it.
- Cloudflare's Python Workers run FastAPI through their ASGI adapter
  (`asgi.entrypoint(app)` or the current equivalent; check it in the
  installed `workers-py`), the `python_workers` compatibility flag and Python
  3.13. Use the official FastAPI skill and Cloudflare's `wrangler` and Workers
  best-practices skills.
- `pywrangler` needs uv 0.13.4 or newer. If the machine's uv is older, stop
  and tell the lead; don't work around it.
- Three invented players, no network in tests.

## Acceptance criteria

- `GET /api/v2/players/{player}` returns `name` (`players/{id}`),
  `displayName`, `position`, `tier` and `overall`, camelCase by model alias.
- An unknown player is a 404, a bad id (ADR 0005 D2) a 400 that never reaches
  the database, and a database failure a 500, all in T-0135's error shape.
- A 500 body comes only from one fixed-message helper in `errors.py` (for
  example `internal_error()`), and the app maps every `DatabaseError` and
  unexpected exception to it, so no internal detail reaches a response
  (T-0135 review F1).
- `wrangler.jsonc` binds D1 as `DB` for local development, and a migration
  creates `players` and seeds the three invented players.
- The Worker runs locally on the Workers runtime (`pywrangler dev`, after
  applying the migration locally), and the report pastes one real request and
  response for a known player and one for an unknown player.
- `make check COMPONENT=data` passes.

## Edge cases

- An id with uppercase letters, `%2F`, `..`, a leading digit or hyphen, an
  underscore or 64 characters: 400.

## Tests

- `test_players.py` with FastAPI's test client over the real migration loaded
  into SQLite through the fake binding.

## Out of scope

- Deploying, a real D1 database and infrastructure (a later task, applied by
  the tech lead). Lists, OpenAPI checks, the MCP server, the pipeline and the
  website.
