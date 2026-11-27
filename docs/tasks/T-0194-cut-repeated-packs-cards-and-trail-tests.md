---
id: T-0194
title: Cut packs, cards and Transfer Trail end-to-end tests that repeat a lower layer
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/packs*.spec.ts
  - apps/web/tests/cards*.spec.ts
  - apps/web/tests/transfer-trail.spec.ts
  - apps/web/tests/masthead.spec.ts
  - apps/web/src/lib/packs/**/*.test.ts
  - apps/web/src/lib/cards/**/*.test.ts
  - apps/web/src/lib/collection/**/*.test.ts
  - apps/web/src/routes/packs/**/*.test.ts
  - apps/web/src/routes/games/transfer-trail/**/*.test.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The same cut as T-0193, for the packs, cards, masthead and Transfer Trail
specs (ADR 0011 D2).

It starts after T-0193.

## Context

- `docs/reviews/test-suite-audit-20261123T210553Z.md`, finding A2.
- Known candidates, each to confirm: the double tap on Open, saving
  refused and device full in `packs-progress.spec.ts`; the double tap on
  Check, reduced motion and a wrong trail in `transfer-trail.spec.ts`,
  against `TrailBoard.svelte.test.ts` and `TrailView.svelte.test.ts`.

## Acceptance criteria

- The same rules as T-0193.
- The report has a table of every test removed or moved: its old file and
  title, and the test that now covers the behaviour (file and title). A
  removed test with no cover is a `must_fix`.

## Edge cases

- "Another tab changed the saved cards" uses a real storage event, so it
  stays end to end.

## Tests

- component or unit: a test for each moved behaviour, in the component's
  own test file.
- end-to-end: the specs that remain, all passing.

## Out of scope

- Any change to source code. A fault found is reported, not fixed here.
- The match specs, which T-0193 covers.
