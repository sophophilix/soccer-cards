---
id: T-0120
title: Test playing a match on screen end to end
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/tests/match-play.spec.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

Playing a match gets end-to-end tests in a real browser: kick off, the
timed moments, skip, a saved win and loss, a draw and Play again. T-0114's
first build was 605 lines, so its end-to-end spec moved here.

## Context

- Merge T-0114 first. Read its brief, `MatchView.svelte` and
  `MatchStage.svelte`.
- `computerSide` needs at least one card of each tier, so the spec serves
  its own card set with all four tiers. Fix the seed by stubbing
  `crypto.getRandomValues` with `addInitScript`.
- A saved copy of the first build's spec may exist; the lead says where.

## Acceptance criteria

- Kick off opens the stage with the board, both plans and both teams.
- At normal speed the moments show one at a time; with reduced motion the
  match plays out in about a second.
- A win skipped to full time saves the coins and the record, read back
  after a reload, and shows "Open a pack" at 5 coins or more.
- A loss counts and earns no coins.
- A draw stops at full time with the penalties line and saves nothing.
- Leaving before full time saves nothing.
- Play again goes back to the pick screen with the same 11.
- Axe scans the stage at full time with no violations.
- When a new moment appears, the older commentary lines keep their text
  (T-0114 review F1), and the result panel has `role="status"` for a win,
  a loss and a draw (T-0114 review F2).
- Kick off tapped twice starts one match, and a failed save still shows
  the result with the store's notice (T-0114 review F4).
- `make check COMPONENT=web` passes.

## Edge cases

- None beyond the criteria. This task adds tests only.

## Tests

- `apps/web/tests/match-play.spec.ts`: one test per criterion.

## Out of scope

- Any change under `apps/web/src`. If a test finds a real fault, stop and
  tell the lead; the fix is its own task.
