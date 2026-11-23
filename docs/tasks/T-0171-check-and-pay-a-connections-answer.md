---
id: T-0171
title: Check a Connections answer and pay coins from the economy table
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/connections-round.ts
  - packages/game/src/connections-round.test.ts
  - packages/game/src/connections-round.property.test.ts
  - packages/game/src/economy.ts
  - packages/game/src/economy.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 330
status: done
---

## Goal

The second Connections task (see T-0170). A child's pick is checked, and a
round pays 1 coin for each right answer and 2 for finishing, as in the
prototype the tech lead and the kids played. It starts after T-0170
merges.

## Context

- ADR 0010 D1: coin amounts live in `economy.ts` only, with a version.
- ADR 0009 D6: a wrong answer shows the right one and takes nothing away.
- `packages/game/src/transfer-trail-round.ts` (`PaidTrailRound`,
  `checkTrailInRound`, `finishTrailRound`) is the pattern to follow for a
  paid round: the round records what has been answered, so nothing pays
  twice.

## Acceptance criteria

- `economy.ts` names `CONNECTIONS_RIGHT_COINS = 1` and
  `CONNECTIONS_FINISH_COINS = 2`, and `ECONOMY_VERSION` goes up by 1.
- `answerConnection(round, state, questionIndex, clubId)` says whether the
  club is the question's answer, pays 1 coin for a right first answer, and
  returns the new round and a new `PlayerState`. A question answers once:
  a second answer is ignored and pays nothing.
- `finishConnectionsRound(round, state)` pays 2 coins once every question
  has been answered, refuses before then, and pays nothing a second time.
- A round pays at most its questions plus 2. A wrong answer takes nothing
  away, and the old state is never changed.

## Edge cases

- A question index outside the round, or a club that isn't one of the
  question's four options, is a refusal.
- A round with fewer than 5 questions pays 1 per right answer plus 2.

## Tests

- `connections-round.test.ts`: each criterion and edge case.
- `connections-round.property.test.ts` (fast-check): however answers and
  finishes repeat, a round never pays more than its questions plus 2.
- `economy.test.ts`: the two new rows and the new version.

## Out of scope

- Dealing (T-0170) and `apps/web`.
