---
id: T-0135
title: Prove a FastAPI Python Worker can answer one v2 route from D1
component: data
kind: feature
agent: data-implementer
paths:
  - apps/api/**
dependencies:
  - fastapi
  - workers-py
  - httpx
  - pytest
  - mypy
  - ruff
  - bandit
max_changed_lines: 400
status: ready
---

## Goal

ADR 0008 puts the player API on a FastAPI app running on a Cloudflare Python
Worker, reading Cloudflare D1. Before building the whole API, prove the parts
fit: one route, one table, locally, with the project's gates passing.

## Context

- ADR 0005 (Google's AIPs, resource names, camelCase fields) and ADR 0008 (D2
  to D5, D10). Read both first.
- Cloudflare's Python Workers run FastAPI through an ASGI adapter
  (`asgi.entrypoint(app)`, Python 3.13 or later, the `python_workers`
  compatibility flag). Use Cloudflare's `wrangler` and Workers best-practices
  skills, and the official FastAPI skill once `fastapi` is installed and the
  lead has added it.
- `workers-py` is Cloudflare's tooling for Python Workers under `uv`. If the
  tooling needs a different or extra package, stop and tell the lead before
  adding it: the brief lists every package.
- Data is invented for this spike: three players with made-up names. No
  network request in tests.

## Acceptance criteria

- `apps/api` is a `uv` project with a `src` layout and its own `pyproject.toml`
  (ruff, mypy, bandit and pytest configured as in `data/pipeline`), so
  `make check COMPONENT=data` runs its gates.
- A `wrangler.jsonc` for a Python Worker with a D1 binding named `DB` for local
  development only, and a SQL migration that creates a `players` table and
  seeds the three invented players.
- `GET /api/v2/players/{player}` returns the player's AIP resource:
  `name` (`players/{id}`), `displayName`, `position`, `tier` and `overall`,
  with camelCase field names from model aliases.
- An unknown player returns 404 with one AIP-193 error body
  (`{"error": {"code": 404, "message": "...", "status": "NOT_FOUND"}}`).
- A player id that isn't a valid slug (ADR 0005 D2) returns 400 with the same
  error shape and never reaches the database.
- The query layer has no write method: every statement is a `SELECT` with
  bound parameters.
- The report says how the Worker was run locally (for example
  `pywrangler dev`) and pastes one real request and response from it.

## Edge cases

- An id with uppercase letters, a slash, `..` or more than 63 characters: 400.
- A D1 error: 500 with the AIP-193 shape and no internal detail in the message.

## Tests

- pytest with FastAPI's test client and an in-memory stand-in for the D1
  binding: the player found, unknown, a bad id, the error shape, camelCase
  names, and a test that the query layer refuses anything but `SELECT`.

## Out of scope

- Deploying, infrastructure and a real D1 database (a later task, applied by
  the tech lead).
- The pipeline publishing to D1, the list methods, OpenAPI checks, the MCP
  server and the website.
