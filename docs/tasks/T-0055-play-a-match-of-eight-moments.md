---
id: T-0055
title: Play a match of eight moments
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/match.ts
  - packages/game/src/play-match.test.ts
  - packages/game/src/play-match.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

Two lined-up teams play a match. Each of eight moments is a fight for the
ball in midfield and then a shot, so formation, tactics and every line of
the team matter, not just a total.

## Context

- `prototype/soccer-cards-prototype.html`: `MINUTES`, `startBattle` and
  `stepBattle`.
- Runs after T-0038, which gives a side's strength and the two chances.
- The second half of the match as first built. The work is on the branch
  `feat/T-0038-play-a-match-of-eight-moments` at 5c99e12; take from it
  what T-0038 left.
- The match is pure: it takes two sides and a `Random` and returns the
  whole result. Timing and commentary text belong to the web app.
- Aim for about 250 changed lines. The limit is 300.

## Acceptance criteria

- `playMatch(home, away, random)` returns eight moments at minutes 7, 18,
  29, 41, 53, 64, 76 and 88.
- In a moment, one side wins the ball by `ballChance`, then scores by
  `scoringChance`. A shot that doesn't score is a save 6 times in 10 and
  wide otherwise.
- Each moment lists the minute, which side had the ball, the card that
  won it (a midfielder of that side), the shooter (a forward), the keeper
  (the other side's goalkeeper) and the outcome: goal, save or wide.
- The result has the final score and which side, if either, had the
  tactical edge.
- The rolls of a moment come in a fixed order: the ball, the shot, then
  save or wide, then the three cards.
- A side with no card at all is a programmer error and throws.
- Every number above is a named constant.
- `make check COMPONENT=game` passes.

## Edge cases

- A side with no midfielder, forward or goalkeeper in the line. The card
  named in the moment is then any card of that side.
- Equal sides. Over 20,000 seeds each wins about as often as the other.
- The same seed gives the same match.

## Tests

- `play-match.test.ts`: a stub `Random` forces each outcome of a moment;
  the order of the rolls; the tactical edge for each side and for neither.
- `play-match.property.test.ts`: the score equals the count of goal
  moments for each side; there are always eight moments in minute order;
  the same seed gives the same match.

## Out of scope

- Penalties after a draw, coins and divisions.
- The computer's choice of team.
