---
id: T-0178
title: Deal a Guess the Club round in the game package
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/guess-the-club.ts
  - packages/game/src/guess-the-club.test.ts
  - packages/game/src/guess-the-club.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

In Guess the Club a child reads a player's career with one club hidden and
picks the missing club from four (ADR 0009 D1). It comes to the site in
five tasks: deal (this one), check and pay (T-0179), the board (T-0180),
the page (T-0181) and the browser tests (T-0182). It starts after T-0177
merges.

## Context

- `prototype/soccer-cards-prototype.html`, Guess the Club (`gcHidden`,
  `startClub`, `gcDeal`) is the approved behaviour.
- ADR 0009 D6: pure functions with the random source passed in; questions
  only from published facts.
- `packages/game/src/connections.ts` (T-0170) for the round style;
  `Career` and `Spell` (with `games` from T-0177).

## Acceptance criteria

- `startGuessRound(careers, random)` picks up to 5 different players who
  have 3 or more spells and at least one spell with a known games count.
  With none, it returns a refusal.
- Each question's hidden club is the club of the spell with the most games;
  on a tie, the earlier spell. A spell with no games count can't be the
  hidden one.
- The four options are the hidden club and three clubs from the careers
  given that the player never played for, in a shuffled order.

## Edge cases

- A player who played for the hidden club in more than one spell: the
  question says which spells are hidden (every spell at that club).
- Fewer than three clubs the player never played for across all careers:
  that player isn't asked.
- Two careers with the same player id are both dropped.

## Tests

- `guess-the-club.test.ts`: each criterion and edge case with invented
  careers.
- `guess-the-club.property.test.ts` (fast-check): every question has four
  distinct options, exactly one of which the player played for, and the
  hidden club is the one with the most games.

## Out of scope

- Checking, coins (T-0179) and `apps/web`.
