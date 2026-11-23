---
id: T-0166
title: Test Transfer Trail end to end in the browser
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/transfer-trail.spec.ts
  - apps/web/tests/a11y/home.spec.ts
  - apps/web/tests/privacy/journeys.spec.ts
  - apps/web/tests/views.spec.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

The last of the three screen tasks (see T-0161). Browser tests prove a
child can play Transfer Trail from start to finish on the built site. It
starts after T-0165 merges. Carry `transfer-trail.spec.ts` over from commit
a6a5384 on `spike/t-0161-full`.

## Context

- The existing specs under `apps/web/tests/` and how they serve invented
  players and fix the random seed.
- `ts-testing`, `child-safety-privacy`.

## Acceptance criteria

- `transfer-trail.spec.ts`, with invented players and careers served in
  place of the real files and a fixed seed:
  - a full round with the mouse, ending with the right coin count in the
    masthead;
  - a round with the keyboard alone;
  - a wrong trail shows the right order in words;
  - reduced motion: nothing on the board animates;
  - a career that fails to load is left out, and no careers gives the
    can't-start screen;
  - at 320 and 390 pixels a long club name wraps with no sideways scroll;
  - a double tap on Check pays once.
- `/games/transfer-trail` is added to the accessibility scan, the privacy
  journeys (one origin, no cookie) and the page list in `views.spec.ts`.

## Edge cases

- The tests use no real player or club data.

## Tests

- This task is tests. All pass in `make check COMPONENT=web`.

## Out of scope

- Any change to the screen. A test that finds a fault is reported, not
  fixed here.
