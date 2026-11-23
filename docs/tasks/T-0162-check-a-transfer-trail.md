---
id: T-0162
title: Check a child's Transfer Trail against the player's career
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/transfer-trail.ts
  - packages/game/src/transfer-trail-check.test.ts
  - packages/game/src/transfer-trail-check.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 250
status: done
---

## Goal

The second of the three Transfer Trail rule tasks (see T-0158). Given a
player's career and the clubs a child put in order, say whether the trail
is right and which places are right. It starts after T-0158 merges.

## Context

- ADR 0009 D6: a wrong answer shows the right one.
- `prototype/soccer-cards-prototype.html`, the Transfer Trail Check handler.
- `trailOrder` from T-0158 gives the right order.
- Commit c8ccf1b on `feat/T-0158-transfer-trail-rules` already holds
  `checkTrail` and its tests. Carry them over.

## Acceptance criteria

- `checkTrail(career, answer)` takes the club ids in the child's order and
  returns whether the whole trail is right and, for each place, whether the
  club there is right.
- Two spells at the same club are the same answer in either order (Buffon:
  Parma, Juventus, Paris Saint-Germain, Juventus, Parma).
- An answer with the wrong number of clubs, or with a club that isn't in
  the career, is a refusal, not a wrong trail.

## Edge cases

- Two spells that start in the same year: the career's order is the right
  one.
- An answer that uses a club more times than the career has it is a
  refusal.

## Tests

- `transfer-trail-check.test.ts`: each criterion and edge case with
  invented careers.
- `transfer-trail-check.property.test.ts` (fast-check): the right order
  always checks right, and any order is right exactly when every place
  matches by club.

## Out of scope

- Picking and dealing (T-0158) and coins (T-0163).
