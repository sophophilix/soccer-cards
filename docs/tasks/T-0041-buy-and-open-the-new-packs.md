---
id: T-0041
title: Buy and open the new packs from the player's state
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/state.ts
  - packages/game/src/state.test.ts
  - packages/game/src/state.property.test.ts
  - packages/game/src/packs.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 240
status: done
---

## Goal

When a player opens a pack, it is a pack of base and lucky cards, and a
jumbo costs 20 coins, as in the approved prototype.

## Context

- Runs after T-0036, which adds `drawPack`.
- `packages/game/src/state.ts`: `openPlayerPack`, `PackToOpen` and
  `JUMBO_PACK_COST_COINS`.
- `packs.property.test.ts` tests only the old rule's properties. Deleting
  it here keeps the next task, which removes the old rule, under its size
  limit. The old rule's unit tests in `packs.test.ts` stay until then and
  keep it covered.
- Aim for about 170 changed lines, 86 of them that deleted file. The limit
  is 240.

## Acceptance criteria

- `openPlayerPack` draws with `drawPack`. `PackToOpen.cardSet` is a
  `CheckedCardSet`.
- A jumbo pack costs 20 coins. A standard pack still costs 5.
- A pending standard pack holds 10 card ids and a pending jumbo holds 50.
- A set that `drawPack` refuses gives the existing `not-enough-cards`
  refusal and changes nothing: no coin and no free pack is spent.
- The test card sets in `state.test.ts` and `state.property.test.ts` have
  at least one card of every tier, through the helpers in `testing/`.
- The tests that pin the old prices and sizes change to the new ones. No
  other state test changes its meaning.
- `packs.property.test.ts` is deleted.
- `make check COMPONENT=game` passes, with coverage still over its
  thresholds.

## Edge cases

- A player with 19 coins and no free pack asks for a jumbo. Refused.
- A player with a free pack and 20 coins opens a standard pack. The free
  pack is used and the coins stay.
- A set with no Icon. Refused, and the state is unchanged.

## Tests

- `state.test.ts`: the price and size rows, the refusal, and each edge
  case.
- `state.property.test.ts`: coins never go below zero; a pending pack's
  size matches its kind; adding a pending pack raises the collection's
  card count by that size.

## Out of scope

- `packs.ts` and `packs.test.ts`. T-0042 removes the old rule.
- `draw-pack.ts`.
