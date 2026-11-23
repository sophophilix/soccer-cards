---
id: T-0157
title: Gather every coin amount into one economy table
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/economy.ts
  - packages/game/src/economy.test.ts
  - packages/game/src/state.ts
  - packages/game/src/divisions.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 200
status: done
---

## Goal

ADR 0010 D1 (accepted 2026-11-23) says every way to earn or spend coins is in
one module in `packages/game`, with named constants and a version, and that
nothing else gives or takes coins. Today the pack prices are in `state.ts`
and the match win coins are in `divisions.ts`. Transfer Trail (T-0158) adds
the first new earning, so the table has to exist first.

## Context

- ADR 0010 D1 and its tables. Only the rows that exist in the game today go
  in now: the starting coins (0), the standard pack (5), the jumbo pack
  (20) and the win coins by division (4, 5, 6, 8, 10). Rows for things not
  built yet (training, team packs, clothes, special editions) don't go in.
  Free packs aren't coins and stay in `state.ts`.
- `packages/game/src/state.ts` (`STANDARD_PACK_COST_COINS`,
  `JUMBO_PACK_COST_COINS`, `STARTING_COINS`) and
  `packages/game/src/divisions.ts` (`winCoins` per division).
- `ts-style-guide` and `ts-testing`.

## Acceptance criteria

- `packages/game/src/economy.ts` holds every coin amount the game uses, as
  named constants, and exports `ECONOMY_VERSION`, starting at 1.
- `state.ts` and `divisions.ts` read their coin amounts from `economy.ts`.
  Neither holds a coin number of its own.
- Every name `packages/game` exports today is still exported with the same
  value, so nothing in `apps/web` changes.
- `economy.test.ts` pins each amount to the ADR 0010 D1 table, so changing a
  number fails a test that names the row.
- All existing tests in `packages/game` pass unchanged.

## Edge cases

- A division's win coins stay readable from `DIVISIONS` as they are today.
- No circular import between `economy.ts`, `state.ts` and `divisions.ts`.

## Tests

- `packages/game/src/economy.test.ts`: one test per row of the table, and
  one for `ECONOMY_VERSION`.
- The existing `state`, `divisions` and `results` tests pass unchanged.

## Out of scope

- Transfer Trail's coins (T-0158).
- Any change to an amount, to the saved player state or to `apps/web`.
