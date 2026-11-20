---
id: T-0066
title: Give each worktree its own preview port
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/playwright.config.ts
  - apps/web/package.json
dependencies: []
max_changed_lines: 80
status: ready
---

## Goal

Two agents can run the web gate at the same time without one testing the
other's build. Today every worktree serves its preview on port 8787, and
Playwright reuses whatever server holds that port, so a run can pass
against another worktree's code without saying so. It happened on
2026-11-20 with T-0051, T-0052 and T-0063.

## Context

- `apps/web/playwright.config.ts`: `PREVIEW_URL`, `webServer` and
  `reuseExistingServer`.
- `apps/web/package.json`: the `preview` script runs `wrangler dev`.
- `apps/web/wrangler.jsonc` sets `dev.port`. Wrangler's `--port` flag
  overrides it. Read the current Wrangler page before using a flag.
- In CI (`process.env.CI` set) there is one checkout, so behaviour there
  may stay as it is.
- Aim for about 40 changed lines.

## Acceptance criteria

- Outside CI, the preview port comes from the worktree's folder, so two
  worktrees get different ports, and the same folder always gets the same
  port.
- A `PREVIEW_PORT` environment variable overrides it.
- Playwright never reuses a server it didn't start. A port that is
  already taken fails the run with a message that names the port.
- `make check COMPONENT=web` passes.

## Edge cases

- The derived port falls in a range that needs no special rights and
  avoids well-known ports.
- The main checkout and a worktree run the gate at the same time.

## Tests

- The report shows two worktrees running `make check COMPONENT=web` at
  the same time, each on its own port, both passing.

## Out of scope

- `wrangler.jsonc` and the deploy and preview workflows (T-0056, T-0057).
