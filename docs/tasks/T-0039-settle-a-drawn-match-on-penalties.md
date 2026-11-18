---
id: T-0039
title: Settle a drawn match on penalties
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/penalties.ts
  - packages/game/src/penalties.test.ts
  - packages/game/src/penalties.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

A match that ends level goes to penalties, where the player picks a corner
for each kick and each dive. A match always has a winner.

## Context

- `prototype/soccer-cards-prototype.html`: `askPen` and `takePen`.
- Runs after T-0038.
- A shoot-out is a small state that one kick moves forward. The player's
  choice of corner comes in as an argument; the other side's comes from
  `Random`.
- Aim for about 130 changed lines. The limit is 200.

## Acceptance criteria

- The player kicks first, then the sides take turns.
- For each kick the player picks left, middle or right, and the other side
  picks one of the three at random.
- When both pick the same corner, the kick is saved with probability
  `0.6 + (keeper strength − 80) ÷ 100`, kept between 0.3 and 0.9. The
  keeper strength is the defending side's goalkeeper strength from the
  match.
- A kick that isn't saved misses the goal 5 times in 100.
- The shoot-out ends as soon as one side can't be caught within its five
  kicks. Level after five each, it goes on one pair at a time until a pair
  leaves one side ahead.
- Each kick's result says who kicked, both corners, and whether it was a
  goal, a save or a miss.
- A kick after the shoot-out is over returns an error result.
- `make check COMPONENT=game` passes.

## Edge cases

- 3–0 after three kicks each. It is over.
- Level after five each, then both score, then one misses.
- A corner that isn't one of the three returns an error result.

## Tests

- Unit tests for each criterion and edge case, with a stub `Random`.
- Property tests: a finished shoot-out never has equal scores; neither
  side is ever more than one kick ahead of the other in kicks taken; the
  same seed and the same choices give the same shoot-out.

## Out of scope

- What the player wins. The next task pays it.
