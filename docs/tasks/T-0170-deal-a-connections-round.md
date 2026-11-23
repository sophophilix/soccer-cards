---
id: T-0170
title: Deal a Connections round in the game package
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/connections.ts
  - packages/game/src/connections.test.ts
  - packages/game/src/connections.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 330
status: ready
---

## Goal

In Connections a child sees two players and picks, from four clubs, a club
they both played for (ADR 0009 D1). The tech lead asked on 2026-11-23 for
it in the real site after Transfer Trail. Connections comes in five tasks,
each kept well under the 400-line ceiling: deal a round (this one), check
and pay (T-0171), the board (T-0172), the page (T-0173) and the browser
tests (T-0174).

## Context

- `prototype/soccer-cards-prototype.html`, Connections (`cnPairs`,
  `cnShared`, `cnDeal`) is the approved behaviour.
- ADR 0009 D6: pure functions, the random source passed in; a question only
  from published facts.
- `packages/game/src/transfer-trail.ts`: `Career`, `Spell`, `ClubId`, and
  the style of `startTrailRound`. Reuse the career types; don't change that
  file.

## Acceptance criteria

- `startConnectionsRound(careers, random)` picks up to 5 different pairs of
  players who share at least one club (the same club id in both careers).
  With no sharing pair it returns a refusal.
- Each question holds the two player ids, the shared club chosen as the
  answer, and four different club options in a shuffled order.
- Exactly one option is a club both players had. When they share more than
  one club, one is chosen as the answer and the others are never options.
- The three wrong options are clubs from either player's career that the
  two don't share, then, if that's fewer than three, other clubs from the
  careers given, never a shared one.
- No pair is asked twice in a round.

## Edge cases

- Two careers with the same player id are both dropped.
- A player who appears in two pairs in one round is fine.
- When fewer than three wrong clubs exist across all careers, the pair is
  not asked.
- Fewer than 5 sharing pairs: the round has as many as there are.

## Tests

- `connections.test.ts`: each criterion and edge case with invented
  careers (no real player data).
- `connections.property.test.ts` (fast-check): for any careers and seed,
  every question has four distinct options with exactly one shared club,
  and no pair repeats.

## Out of scope

- Checking an answer and coins (T-0171), and `apps/web`.
