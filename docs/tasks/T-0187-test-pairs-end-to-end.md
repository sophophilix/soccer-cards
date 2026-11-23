---
id: T-0187
title: Test Pairs end to end in the browser
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/pairs.spec.ts
  - apps/web/tests/a11y/home.spec.ts
  - apps/web/tests/privacy/journeys.spec.ts
  - apps/web/tests/views.spec.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

The last Pairs task (see T-0183). Browser tests prove a child can play
Pairs from start to finish on the built site. It starts after T-0186 and
T-0182 merge (T-0182 changes the same test lists).

## Context

- The other game specs (T-0166, T-0174, T-0182): invented data with
  `page.route`, a saved player state with invented owned cards, a fixed
  seed.

## Acceptance criteria

- `pairs.spec.ts`: a 6-pair board played to the end with the mouse, paying
  the right coins in the masthead (with the bonus when few turns); a board
  with the keyboard alone; a mismatch turns back; sizes disabled for a
  player with too few cards; reduced motion turns cards with no flip; 320
  and 390 pixels with no sideways scroll.
- `/games/pairs` joins the accessibility scan with no exceptions, the
  privacy journeys and the views checks.

## Edge cases

- No real player data in saved state.

## Tests

- This task is tests. All pass in `make check COMPONENT=web`.

## Out of scope

- Any change to the screen. A fault found is reported, not fixed here.
