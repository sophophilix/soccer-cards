---
id: T-0038
title: Play a match of eight moments with tactics
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/match.ts
  - packages/game/src/match.test.ts
  - packages/game/src/match.property.test.ts
  - packages/game/src/random.ts
  - packages/game/src/random.test.ts
  - packages/game/src/random.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

Two lined-up teams play a match. Each of eight moments is a fight for the
ball in midfield and then a shot, so formation, tactics and every line of
the team matter, not just a total.

## Context

- `prototype/soccer-cards-prototype.html`: `TACTICS`, `EDGE`, `MINUTES`,
  `strength`, `startBattle` and `stepBattle`.
- Runs after T-0037.
- `Random` has no way to roll a probability. This task adds one method to
  it for that.
- The match is pure: it takes two sides and a `Random` and returns the
  whole result. Timing and commentary text belong to the web app.
- Aim for about 200 changed lines. The limit is 300.

## Acceptance criteria

- The tactics are All-out attack, Counter-attack, Keep the ball and Park
  the bus, with the prototype's factors for attack, midfield and defence.
  Each beats exactly one other, in one loop of four.
- A side's strength is the mean worth of each line, times its tactic's
  factor. An empty line counts as 30.
- A side whose tactic beats the other's has every line multiplied by 1.08.
  A side may also carry a form bonus in percent.
- A match is eight moments at minutes 7, 18, 29, 41, 53, 64, 76 and 88.
- In a moment, a side wins the ball with probability its midfield squared
  over the sum of both midfields squared.
- The side with the ball scores with probability
  `0.34 × (attack ÷ defence)² × (84 ÷ goalkeeper)^1.5`, kept between 0.06
  and 0.7.
- The result lists each moment: the minute, which side had the ball, the
  card that won it, the shooter, the keeper, and whether it was a goal,
  a save or wide. It also has the final score and whether either side had
  the tactical edge.
- Every number above is a named constant.
- `make check COMPONENT=game` passes.

## Edge cases

- A side with no midfielder, forward or goalkeeper in the line. The card
  named in the moment is then any card of that side.
- Equal sides. Over many seeds each wins about as often as the other.
- The same seed gives the same match.

## Tests

- Unit tests for each criterion, with a stub `Random` to force each
  outcome of a moment.
- Property tests: the score equals the count of goal moments for each
  side; there are always eight moments in minute order; a stronger attack
  never lowers the scoring probability; the same seed gives the same match.
- Tests for the new `Random` method: it never returns true for 0, always
  for 1, and refuses a value outside 0 to 1.

## Out of scope

- Penalties after a draw, coins and divisions. They are the next tasks.
- The computer's choice of team.
