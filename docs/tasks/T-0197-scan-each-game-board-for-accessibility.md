---
id: T-0197
title: Scan each game's board, result and finish screen for accessibility
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/a11y/games.spec.ts
  - apps/web/tests/a11y/home.spec.ts
  - apps/web/tests/connections.spec.ts
dependencies:
  - T-0202
max_changed_lines: 300
status: done
---

## Goal

T-0174's review (F1, should_fix) found that the accessibility scan of a
game page waits for loading to end, but never checks that a board
appeared. If the load failed, it would scan the can't-start screen and
pass. It also never scans a game after an answer or at the finish.
Transfer Trail has the same gap, and Guess the Club and Pairs join the same
list. One spec should scan each game in the states a child sees.

Start after T-0182 and T-0187 merge, because they add Guess the Club and
Pairs to `a11y/home.spec.ts`.

## Context

- `.sdlc/reviews/T-0174.reviewer.json`, findings F1 and F2.
- `apps/web/tests/a11y/home.spec.ts`: the current scan list and its
  `[data-art]` exclusion.
- `apps/web/tests/transfer-trail.spec.ts` and `connections.spec.ts`: how to
  serve invented data and fix the seed.
- ADR 0011 D2: one browser, no `@engines` tag.

## Acceptance criteria

- For Transfer Trail, Connections, Guess the Club and Pairs, a scan runs
  after the board shows (the test first checks a question, a trail or a
  card is on screen), after one answer or turn, and on the finish screen.
- Each scan runs in light and dark colour schemes, with only the existing
  `[data-art]` exclusion.
- The game pages leave the generic list in `a11y/home.spec.ts`, so each
  game is scanned in one place.
- The Connections wrap test proves a long club name wraps: the name's
  text spans more than one line, not just that the tile is taller than
  44 px (T-0174 F2).

## Edge cases

- A game's can't-start screen is scanned once, on purpose, with data that
  can't start a round.

## Tests

- end-to-end: `a11y/games.spec.ts`: each game's board, answered state,
  finish screen and can't-start screen, in both colour schemes.
- end-to-end `@engines`: `connections.spec.ts`: the long name wraps at 320
  and 390 px.

## Out of scope

- Product code. If a scan finds a violation, don't fix it and don't
  exclude it. Stop and report it to the lead, who plans a `fix` task first.
