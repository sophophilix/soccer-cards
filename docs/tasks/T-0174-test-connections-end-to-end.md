---
id: T-0174
title: Test Connections end to end in the browser
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/connections.spec.ts
  - apps/web/tests/a11y/home.spec.ts
  - apps/web/tests/privacy/journeys.spec.ts
  - apps/web/tests/views.spec.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

The last Connections task (see T-0170). Browser tests prove a child can
play Connections from start to finish on the built site. It starts after
T-0173 merges.

## Context

- ADR 0011 D2 applies. Test journeys, saved progress across reloads, the
  accessibility scan and privacy here. Leave out a guard or a computed value
  that a component or game test already covers, and say which in the
  report. Tag width, touch and tap-target tests `@engines` (T-0192).
- `apps/web/tests/transfer-trail.spec.ts` (T-0166) is the pattern: invented
  players, clubs and careers served with `page.route`, a fixed seed, and
  waiting out the board's short pause before Next.
- `ts-testing`, `child-safety-privacy`.

## Acceptance criteria

- `connections.spec.ts`, with invented data and a fixed seed:
  - a full round with the mouse, ending with the right coin count in the
    masthead;
  - a round with the keyboard alone;
  - a wrong answer shows the right club and both players' years in words;
  - a double tap on a right club pays exactly one answer's coin;
  - a career that fails is left out, and no sharing pair gives the
    can't-start screen;
  - at 320 and 390 pixels a long club name wraps with no sideways scroll.
- `/games/connections` joins the accessibility scan with no exceptions, the
  privacy journeys and the views checks.

## Edge cases

- The tests use no real player or club data.

## Tests

- This task is tests. All pass in `make check COMPONENT=web`.

## Out of scope

- Any change to the screen. A fault found is reported, not fixed here.
