---
id: T-0191
title: Move the three config test files from Playwright to Vitest
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/preview-port.spec.ts
  - apps/web/tests/preview-target.spec.ts
  - apps/web/tests/privacy/worker-config.spec.ts
  - apps/web/preview-port.test.ts
  - apps/web/preview-target.test.ts
  - apps/web/worker-config.test.ts
  - apps/web/vite.config.ts
dependencies: []
max_changed_lines: 260
status: ready
---

## Goal

Three Playwright spec files test config functions and open no page, but
run in three browsers (ADR 0011 D2). Move them to Vitest in Node.

It starts after T-0190, so the Node project exists.

## Context

- `apps/web/preview-port.ts`, `apps/web/preview-target.ts` and
  `apps/web/wrangler.jsonc`, which the three files test.
- T-0190's Node project.

## Acceptance criteria

- The three `.spec.ts` files are gone from `apps/web/tests/`.
- Their tests run in the Vitest Node project, with the same titles and
  assertions.
- The Playwright run lists none of them.

## Edge cases

- `worker-config` reads `wrangler.jsonc` from disk. It finds the file
  from the test file's folder, not the working directory.

## Tests

- unit: `preview-port.test.ts`, `preview-target.test.ts`,
  `worker-config.test.ts`: the moved tests.
- The report has a table of every test moved: its old file and
  title, and the test that now covers the behaviour (file and title). A
  removed test with no cover is a `must_fix`.

## Out of scope

- Any change to `preview-port.ts`, `preview-target.ts`,
  `playwright.config.ts` or `wrangler.jsonc`.
