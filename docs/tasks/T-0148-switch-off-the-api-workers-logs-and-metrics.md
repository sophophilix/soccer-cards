---
id: T-0148
title: Switch off the API Worker's logs, traces and Wrangler metrics
component: data
kind: fix
agent: data-implementer
paths:
  - apps/api/wrangler.jsonc
  - apps/api/tests/test_project.py
dependencies: []
max_changed_lines: 60
status: ready
---

## Goal

T-0136's security review (round 3, F1 and F4) found that
`apps/api/wrangler.jsonc` sets only `observability.enabled: false`.
`apps/web/wrangler.jsonc` also turns logs and traces off one by one,
because the platform turns them on when those keys are missing, and sets
`send_metrics: false`. Logs would hold visitors' IP addresses (ADR 0002
D10, ADR 0003 D5). This must land before the API's deploy task.

## Context

- `apps/web/wrangler.jsonc` lines 13 to 20, and their comment.
- `.sdlc/reviews/T-0136.security-reviewer.json` in the main checkout.
- `apps/api/tests/test_project.py` already checks the project's settings.

## Acceptance criteria

- `apps/api/wrangler.jsonc` sets `send_metrics: false` and
  `observability` with `enabled`, `logs.enabled` and `traces.enabled` all
  false, with a comment like the one in `apps/web`.
- A test in `test_project.py` reads `wrangler.jsonc` (comments stripped)
  and fails if any of those four settings is missing or true.
- `make check COMPONENT=data` passes.

## Edge cases

- A key that is present but `true`: the test fails and names it.

## Tests

- `test_project.py`, as above.

## Out of scope

- Deploying, routes, the real D1 database and `pylock.toml` (the API
  deploy task).
