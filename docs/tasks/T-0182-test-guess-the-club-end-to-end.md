---
id: T-0182
title: Test Guess the Club end to end in the browser
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/guess-the-club.spec.ts
  - apps/web/tests/a11y/home.spec.ts
  - apps/web/tests/privacy/journeys.spec.ts
  - apps/web/tests/views.spec.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

The last Guess the Club task (see T-0178). Browser tests prove a child can
play it from start to finish on the built site. It starts after T-0181 and
T-0174 merge (T-0174 changes the same test lists).

## Context

- `apps/web/tests/transfer-trail.spec.ts` (T-0166) and
  `connections.spec.ts` (T-0174): invented data with `page.route`, a fixed
  seed, waiting out the board's pause before Next.

## Acceptance criteria

- `guess-the-club.spec.ts`, with invented data and a fixed seed: a full
  round with the mouse ending with the right coin count; a round with the
  keyboard alone; a wrong answer shows the right club in words; a double
  tap on a right club pays one answer's coin; a failed career is left out
  and nothing to ask gives the can't-start screen; 320 and 390 pixels with
  no sideways scroll.
- `/games/guess-the-club` joins the accessibility scan with no exceptions,
  the privacy journeys and the views checks.

## Edge cases

- No real player or club data.

## Tests

- This task is tests. All pass in `make check COMPONENT=web`.

## Out of scope

- Any change to the screen. A fault found is reported, not fixed here.
