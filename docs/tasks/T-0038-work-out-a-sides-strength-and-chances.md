---
id: T-0038
title: Work out a side's strength and its chances
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/match.ts
  - packages/game/src/match.test.ts
  - packages/game/src/match.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 340
status: ready
---

## Goal

A lined-up team with a tactic has a strength in each line, and from two
strengths the game knows how likely each side is to win the ball and to
score. T-0055 plays the match with these.

## Context

- `prototype/soccer-cards-prototype.html`: `TACTICS`, `EDGE`, `strength`,
  and the two probabilities inside `stepBattle`.
- Runs after T-0037 and T-0046.
- This is the first half of the match. The whole was built at 505 lines,
  164 of code and 311 of tests, against a limit of 380, with its gate
  passing; the implementer stopped without trimming a test. The work is
  on the branch `feat/T-0038-play-a-match-of-eight-moments` at 5c99e12.
  This task takes from it only what is listed here.
- Everything is pure. No `Random` is used in this half.
- Aim for about 290 changed lines. The limit is 340.

## Acceptance criteria

- The tactic ids are exported as a list: `attack`, `counter`,
  `possession`, `defend`.
- Each tactic has the prototype's factors for attack, midfield and
  defence, and beats exactly one other, in one loop of four.
- A match side is a line-up, its cards, a tactic and an optional form
  bonus in percent.
- `sideStrength(side, opponentTactic)` gives the mean worth of each line
  times the tactic's factor. An empty line counts as 30. A side whose
  tactic beats the other's has every line multiplied by 1.08. The form
  bonus multiplies every line.
- `ballChance(side, opponent)` is the side's midfield squared over the sum
  of both midfields squared. When both are 0 it is 0.5.
- `scoringChance(attacking, defending)` is
  `0.34 × (attack ÷ defence)² × (84 ÷ goalkeeper)^1.5`, kept between 0.06
  and 0.7.
- A card id in the line-up that is not among the side's cards is a
  programmer error and throws a `RangeError` that names the id.
- Every number above is a named constant.
- `make check COMPONENT=game` passes.

## Edge cases

- A side with no midfielder, forward or goalkeeper in the line.
- A defence or a goalkeeper strength of 0. The chance stays inside its
  bounds and is a number.
- A negative form bonus.

## Tests

- `match.test.ts`: a row per criterion and edge case.
- `match.property.test.ts`: a stronger attack never lowers the scoring
  probability; both chances are always from 0 to 1.
- A helper in `testing/` that builds a match side.

## Out of scope

- Playing the moments. T-0055 does that.
- Penalties, coins and divisions.
