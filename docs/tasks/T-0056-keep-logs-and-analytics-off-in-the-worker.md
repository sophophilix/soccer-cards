---
id: T-0056
title: Keep logs, traces and analytics off in the Worker's configuration
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/wrangler.jsonc
  - apps/web/tests/privacy/**
dependencies: []
max_changed_lines: 80
status: ready
---

## Goal

The Worker never records a visitor's request. Today `wrangler.jsonc` says
nothing about observability, and a Worker created in the dashboard has logs
on by default. Logs would hold visitors' IP addresses, and from 2026-12-01
Cloudflare bills them by volume. The tech lead asked for this on 2026-11-20.

## Context

- ADR 0002 D8 and D10, ADR 0003 D5, the `child-safety-privacy` and
  `cloudflare-infra` skills.
- `apps/web/wrangler.jsonc` and the tests already in `apps/web/tests/privacy/`.
- Read the current Wrangler configuration page on
  `developers.cloudflare.com` for `observability`, `workers_dev` and
  `preview_urls` before writing a key. Don't write a key from memory.
- Aim for about 40 changed lines.

## Acceptance criteria

- `wrangler.jsonc` turns observability off, with logs and traces off too
  if the current schema has separate keys for them.
- `wrangler.jsonc` keeps preview URLs on, because T-0057 runs the
  end-to-end tests against one.
- `wrangler.jsonc` declares no `routes`, `route` or custom domain.
  OpenTofu owns the address (ADR 0002 D8).
- A test fails if observability, logs or traces are turned on, or if a
  route or custom domain appears.
- `make check COMPONENT=web` passes.

## Edge cases

- `wrangler.jsonc` has comments, so plain `JSON.parse` fails. Strip the
  comments the way the project already reads it, or use a parser already in
  the lockfile.
- A key missing from the file means the platform default, which may be on.
  The test treats a missing observability key as a failure.

## Tests

- One test file in `apps/web/tests/privacy/` that reads `wrangler.jsonc`.

## Out of scope

- The `workers.dev` address: whether it stays on is T-0057's question.
- `_headers`, the build and any workflow.
