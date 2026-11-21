---
id: T-0146
title: Lay the API project's groundwork for its first route
component: data
kind: feature
agent: data-implementer
paths:
  - apps/api/pyproject.toml
  - apps/api/uv.lock
  - apps/api/.gitignore
  - apps/api/src/soccer_cards_api/errors.py
  - apps/api/tests/test_errors.py
  - apps/api/tests/test_project.py
  - apps/api/tests/test_migrations.py
  - apps/api/migrations/**
  - apps/api/tests/conftest.py
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

The first half of T-0136, split off because the whole change was 558 lines.
The API project gets what its first route needs: one fixed 500 helper, a
`no-build-package` list, the D1 migration with three invented players, and
a test fixture that loads that migration.

## Context

- ADR 0008 D4 and D10. T-0135's review files in `.sdlc/reviews/` (F1, F3).
- The full first build is on `feat/T-0136-answer-a-player-from-d1-on-a-python-worker`
  (commit c98d855). Take this task's files from it, and leave the route,
  the Worker and `wrangler.jsonc` for T-0136.
- `data/pipeline`'s `pyproject.toml` and `tests/test_project.py` show the
  `no-build-package` list and its test.
- Three invented players. No real person.

## Acceptance criteria

- `errors.py` has one fixed-message helper, `internal_error()`, that every
  500 uses. Its body carries no detail from any exception (T-0135 review
  F1).
- `[tool.uv]` has a `no-build-package` list that names every locked package
  and the build backend. `tests/test_project.py` fails if one is missing
  (T-0135 security F3).
- `.gitignore` leaves out what `pywrangler dev` writes: `pylock.toml`,
  `python_modules/`, `.venv-workers/` and `.wrangler/`.
- `migrations/0001_create_players.sql` creates `players` and seeds three
  invented players.
- `tests/conftest.py` loads the migration into SQLite through the fake D1
  binding. `tests/test_migrations.py` checks the three seeded players.
- `make check COMPONENT=data` passes.

## Edge cases

- A locked package added later without a `no-build-package` entry:
  `test_project.py` fails and names it.

## Tests

- `test_errors.py`, `test_project.py` and `test_migrations.py`, as above.

## Out of scope

- The route, the app, `worker.py`, `wrangler.jsonc` and the runtime run
  (T-0136).
