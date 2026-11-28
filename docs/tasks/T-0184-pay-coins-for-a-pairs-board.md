---
id: T-0184
title: Pay coins for a finished Pairs board from the economy table
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/pairs-pay.ts
  - packages/game/src/pairs-pay.test.ts
  - packages/game/src/economy.ts
  - packages/game/src/economy.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 200
status: done
---

## Goal

The second Pairs task (see T-0183). A finished board pays 3, 4 or 5 coins
by size, plus 1 when it took no more than twice as many turns as pairs, as
ADR 0010 D1's table and the prototype say. It starts after T-0183 and
T-0179 merge (both change `economy.ts`).

## Context

- ADR 0010 D1: "A memory pairs board (T-0149): 3, 4 or 5 by size, plus 1
  for few flips".
- `prototype/soccer-cards-prototype.html`, `memFinish` and `MEM_COINS`.

## Acceptance criteria

- `economy.ts` names `PAIRS_BOARD_COINS` (6 pairs: 3, 8: 4, 10: 5) and
  `PAIRS_FEW_TURNS_BONUS = 1`, and `ECONOMY_VERSION` goes up by 1.
- `payPairsBoard(board, state)` pays a finished board once: its size's
  coins, plus the bonus when turns are no more than twice the pairs. It
  returns a new state and records the board as paid; a second call pays
  nothing. An unfinished board is a refusal.

## Edge cases

- Exactly twice as many turns as pairs gets the bonus; one more doesn't.

## Tests

- `pairs-pay.test.ts`: each size, the bonus edge, a second payment, an
  unfinished board.
- `economy.test.ts`: the new rows and the version.

## Out of scope

- `apps/web`.
