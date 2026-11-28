---
id: T-0151
title: Stop the short-link tap target test from flaking
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/tests/a11y/tap-targets.spec.ts
dependencies: []
max_changed_lines: 60
status: done
---

## Goal

"a short link inside a sentence is at least 44 pixels each way" in
`tests/a11y/tap-targets.spec.ts` failed at random three times between
2026-11-21 and 2026-11-22 (T-0132's finish hook twice, T-0150's review
once), each time with the injected link not found. Every rerun passed. A
gate that fails at random teaches everyone to rerun it, which hides real
failures.

## Context

- The test injects a `<p>` with a link into `<main>` right after
  `page.goto('/')`. The likely cause: SvelteKit hydrates after that, re-renders
  `<main>` and removes the injected nodes. Confirm the cause before fixing
  it. Don't add a retry or a longer timeout to hide it.
- `ts-testing` skill: flaky tests.

## Acceptance criteria

- The cause is shown in the report: what removes the link, with evidence.
- The test waits for the page to be ready (hydrated) before injecting, or
  injects where the app doesn't render. It still checks the same thing: a
  short link inside a sentence is at least 44 by 44 pixels.
- The spec passes 50 runs in a row:
  `pnpm --dir apps/web exec playwright test tests/a11y/tap-targets.spec.ts --repeat-each=50`.
  The report pastes the summary line.
- No retry, `test.fixme` or longer timeout is added.
- `make check COMPONENT=web` passes.

## Edge cases

- The same race in the other tests of this file: fix it there too if it
  exists, in the same way.

## Tests

- `tests/a11y/tap-targets.spec.ts`.

## Out of scope

- The app's styles and components, and other spec files.
