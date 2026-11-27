---
id: T-0193
title: Cut match end-to-end tests that repeat a lower layer
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/match*.spec.ts
  - apps/web/src/routes/match/**/*.test.ts
  - apps/web/src/lib/match/**/*.test.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The match specs re-check rules the game package owns and guards that one
component owns, in a full browser (ADR 0011 D2). Keep journeys, saved
progress across reloads and accessibility scans. Move or cut the rest.

It starts after T-0192.

## Context

- `docs/reviews/test-suite-audit-20261123T210553Z.md`, findings A1 and A2.
- Known candidates, each to confirm:
  - `match-team-values.spec.ts`: tactic totals that
    `packages/game/src/match.test.ts` already checks on `sideStrength`.
  - `match-play.spec.ts`: three "the result panel is a status" tests.
  - "Kick off tapped twice starts one match" (`match-play.spec.ts`) and
    "two Kick off clicks before the page updates start one match"
    (`match-notices.spec.ts`): the same guard twice.
  - `match-notices.spec.ts`: one test per save error name.

## Acceptance criteria

- No match spec checks a number a game rule computes. A spec may check
  that the number appears.
- A guard that one component owns is tested in that component's test.
  The end-to-end test stays only when the behaviour crosses a page load or
  a real storage event.
- The report has a table of every test removed or moved: its old file and
  title, and the test that now covers the behaviour (file and title). A
  removed test with no cover is a `must_fix`.

## Edge cases

- A test that looks repeated but checks a reload, real storage or a second
  tab stays.

## Tests

- component or unit: a test for each moved behaviour, in the component's
  own test file.
- end-to-end: the match specs that remain, all passing.

## Out of scope

- Any change to source code. A fault found is reported, not fixed here.
- Specs outside `tests/match*.spec.ts`.
