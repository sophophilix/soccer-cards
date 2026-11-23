---
id: T-0163
title: Pay coins for a Transfer Trail round from the economy table
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/transfer-trail-round.ts
  - packages/game/src/transfer-trail-round.test.ts
  - packages/game/src/transfer-trail-round.property.test.ts
  - packages/game/src/economy.ts
  - packages/game/src/economy.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 350
status: done
---

## Goal

The last of the three Transfer Trail rule tasks (see T-0158). A round pays
1 coin for each trail right on its first check and 2 for finishing, as in
the prototype the tech lead and the kids played. It starts after T-0162
merges.

## Context

- ADR 0010 D1: coin amounts live in `economy.ts` only, with a version.
- ADR 0009 D6: coins are earned in play. No timer, no resetting streak, no
  lives. A wrong answer takes nothing away.
- `startTrailRound` (T-0158) and `checkTrail` (T-0162).
- Commit c8ccf1b on `feat/T-0158-transfer-trail-rules` already holds
  `checkTrailInRound`, `finishTrailRound`, the economy rows and their tests.
  Carry them over.

## Acceptance criteria

- `economy.ts` names `TRAIL_RIGHT_COINS = 1` and `TRAIL_FINISH_COINS = 2`,
  and `ECONOMY_VERSION` goes up by 1.
- `checkTrailInRound(round, state, playerId, answer)` checks the trail with
  `checkTrail`, pays 1 coin when it's right on that player's first check,
  and returns the new round and a new `PlayerState`.
- `finishTrailRound(round, state)` pays 2 coins once every trail has had its
  first check, and refuses before then.
- A round pays at most 5 + 2 coins, however many times a check or the
  finish is repeated. A repeated check or finish pays nothing and isn't a
  refusal.
- A wrong trail takes nothing away. The old state is never changed.

## Edge cases

- A trail put right after a wrong first check pays nothing.
- A player id that isn't in the round is a refusal.
- A round with fewer than 5 players pays 1 per right trail plus 2.

## Tests

- `transfer-trail-round.test.ts`: each criterion and edge case.
- `transfer-trail-round.property.test.ts` (fast-check): a round never pays
  more than its trails plus 2, however checks and finishes repeat.
- `economy.test.ts`: the two new rows and the new version.

## Out of scope

- `apps/web`, picking and dealing (T-0158), checking (T-0162).
