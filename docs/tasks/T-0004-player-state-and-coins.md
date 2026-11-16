---
id: T-0004
title: Add player state with free packs, coins and buying a pack
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/state.ts
  - packages/game/src/state.test.ts
  - packages/game/src/state.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

A new player starts with two free packs and no coins, and pays coins for
packs after that. This task adds the player's state and the rules that
change it.

## Context

- Read ADR 0001 D4 and D6.
- The prototype's `fresh`, `canOpen`, `openPack` and `addPack` show the
  approved behaviour.
- Depends on T-0003. Runs after it, because both change `index.ts`.
- Every function is pure. It takes a state and returns a new state or an
  error result. It never changes its input.

## Acceptance criteria

- A fresh state has 2 free packs, 0 coins, an empty collection, no
  favourites and a state version number.
- Opening a standard pack uses a free pack when one is left. Otherwise it
  costs 5 coins.
- A jumbo pack costs 10 coins. A free pack can't pay for it.
- An opened pack is held as pending until the player adds it. Adding it puts
  every card in the collection, counts doubles and clears the pending pack.
- A second pack can't be opened while one is pending.
- The prices and the starting values are named constants, exported for the
  app's text.
- `make check COMPONENT=game` passes.

## Edge cases

- Buying with too few coins returns an error result and changes nothing.
- Exactly enough coins leaves 0.
- Coins never go below 0, for any sequence of actions.
- Adding with no pending pack returns an error result.
- One free pack left, then none.

## Tests

- Unit tests in `state.test.ts` for each criterion and edge case.
- Property tests in `state.property.test.ts`: coins never go below 0, a
  refused action returns the same state, and the collection's size grows by
  the pack's size when a pack is added.

## Out of scope

- Reading or writing storage, and migrations. The app's state module does
  that in a later task.
- Trading and favourites (T-0005), battles and winning coins (T-0006).
- Any change to `packs.ts` or `random.ts`.
