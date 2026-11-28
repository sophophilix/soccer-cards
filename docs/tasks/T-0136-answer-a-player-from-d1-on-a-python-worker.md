---
id: T-0136
title: Answer GET /api/v2/players/{player} from D1 on a Python Worker
component: data
kind: feature
agent: data-implementer
paths:
  - apps/api/pyproject.toml
  - apps/api/uv.lock
  - apps/api/src/soccer_cards_api/app.py
  - apps/api/src/soccer_cards_api/players.py
  - apps/api/src/worker.py
  - apps/api/wrangler.jsonc
  - apps/api/tests/test_players.py
dependencies:
  - workers-py
  - httpx
max_changed_lines: 400
status: done
---

## Goal

The second half of the ADR 0008 spike: one route, answered by FastAPI on a
Cloudflare Python Worker from a local D1 table, and run for real on the
Workers runtime, to prove the parts fit before the rest of the API is built.

## Context

- Merge T-0146 first. It holds the project groundwork this task builds on:
  the 500 helper, the `no-build-package` list, `.gitignore`, the migration
  and the test fixture that loads it. The first full build was 558 lines,
  so it was split (lead, 2026-11-21).
- That build is on `feat/T-0136-answer-a-player-from-d1-on-a-python-worker`
  (commit c98d855). Take this task's files from it.
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
- The app maps every `DatabaseError` and unexpected exception to T-0146's
  `internal_error()`, so no internal detail reaches a response (T-0135
  review F1). The cause of a 500 is never shown or logged (T-0135 security
  F5).
- Every SQL statement is a constant string in the code; no request text is
  joined into SQL (T-0135 security F4).
- FastAPI's built-in OpenTelemetry is off, set explicitly, and a test proves
  no telemetry is configured (T-0135 security F2, ADR 0003).
- Every package this task adds is in T-0146's `no-build-package` list, so
  `tests/test_project.py` still passes.
- `wrangler.jsonc` binds D1 as `DB` for local development, using T-0146's
  migration.
- The Worker runs locally on the Workers runtime (`pywrangler dev`, after
  applying the migration and T-0146's `seeds/local.sql` to the local
  database only), and the report pastes one real request and response for a
  known player and one for an unknown player. Never apply the seed with
  `--remote`.
- `make check COMPONENT=data` passes.

## Edge cases

- An id with uppercase letters, `%2F`, `..`, a leading digit or hyphen, an
  underscore or 64 characters: 400.

## Tests

- `test_players.py` with FastAPI's test client over the real migration and
  the local seed, loaded into SQLite through T-0146's `conftest.py`.

## Out of scope

- Deploying, a real D1 database and infrastructure (a later task, applied by
  the tech lead). Lists, OpenAPI checks, the MCP server, the pipeline and the
  website.
