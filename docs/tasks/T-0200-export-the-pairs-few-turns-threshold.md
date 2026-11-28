---
id: T-0200
title: Export the Pairs few-turns bonus test from the game package
component: game
kind: refactor
agent: refactorer
paths:
  - packages/game/src/pairs-pay.ts
  - packages/game/src/index.ts
  - apps/web/src/routes/games/pairs/pairs-words.ts
dependencies: []
max_changed_lines: 60
status: ready
---

## Goal

T-0198's review (F1, suggestion). `finishText` in `pairs-words.ts` repeats
the `turns <= size * 2` rule that `payPairsBoard` owns. If the rule
changes, the finish screen and the coins paid would disagree. The rule
should live once, in the game package.

## Context

- `packages/game/src/pairs-pay.ts`: `payPairsBoard` and the bonus test.
- `apps/web/src/routes/games/pairs/pairs-words.ts`: `finishText`.
- ADR 0010 D1: amounts and rules live in the game package.

## Acceptance criteria

- `packages/game` exports one function that says whether a board earned
  the few-turns bonus, and `payPairsBoard` uses it.
- `finishText` uses that function and no longer computes the rule itself.
- Behaviour, the coins paid and the words shown stay exactly the same.

## Edge cases

- A board finished in exactly twice its pairs still earns the bonus.

## Tests

- No test changes. The existing `pairs-pay.test.ts` and
  `pairs-words.test.ts` pin the behaviour.

## Out of scope

- `economy.ts` and the coin amounts.
