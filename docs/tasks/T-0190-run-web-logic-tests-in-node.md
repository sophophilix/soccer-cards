---
id: T-0190
title: Run the web tests that draw nothing in Node
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/vite.config.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

All 34 web test files run in a real Chromium through Vitest browser mode.
Only the files that render a component, or use the DOM, need it. The rest
run faster and lighter in Node (ADR 0011 D2, ADR 0012).

It starts after T-0188, which changes the same file.

## Context

- Vitest `test.projects`: <https://vitest.dev/guide/projects>
- `apps/web/vite.config.ts`. Files named `*.svelte.test.ts` render a
  component. `src/lib/ui/motion.test.ts` and
  `src/lib/state/player-store.test.ts` also use browser globals.

## Acceptance criteria

- Two Vitest projects: `browser` for `*.svelte.test.ts` and the files that
  use browser globals, and `node` for the rest.
- `pnpm --dir apps/web run test` runs both, with the same coverage
  thresholds as before.
- `vitest run --changed` still runs the affected tests in both projects.
- The report names each file in the browser project that isn't a
  `.svelte.test.ts`, and why it needs the browser.

## Edge cases

- A test that passes in Node only because a browser global is missing is
  moved back to the browser project.

## Tests

- This task is configuration. Every existing web test passes, and the
  report gives the time and file count of each project.

## Out of scope

- Any change to a test file or to source code.
