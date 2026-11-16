---
id: T-0003
title: Add the pack opening rules to packages/game
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/cards.ts
  - packages/game/src/packs.ts
  - packages/game/src/packs.test.ts
  - packages/game/src/packs.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 400
status: done
---

## Goal

A player opens a pack and gets a fixed mix of tiers. This task adds that
rule as a pure function, so the app and the tests share one source of truth.

## Context

- Read ADR 0001 D4 and the `ts-testing` skill, section "Property tests for
  the game rules".
- The prototype's `PACKS`, `openPack` and `sample` show the approved
  behaviour.
- Depends on T-0001. Uses the seeded generator from
  `packages/game/src/random.ts`.
- `cards.ts` holds the small card type the rules need: `id`, `tier` and the
  three play stats. It doesn't import `packages/schema` yet.

## Acceptance criteria

- A standard pack has 10 cards: 7 base, 2 rare and 1 legend.
- A jumbo pack has 20 cards: 15 base, 3 rare and 2 legend.
- No card repeats within one pack.
- The function takes the card set, the pack type and a random generator. It
  returns card ids in reveal order: base, then rare, then legend.
- The same seed and the same card set give the same pack.
- The pack mixes and sizes are named constants, exported for the app's text.
- `packages/game/src/testing/` has a card factory, such as
  `aCard({ tier: 'legend' })`, and a card-set factory for tests.
- `make check COMPONENT=game` passes.

## Edge cases

- A card set with too few cards of a tier for the pack returns an error
  result that names the tier. It never returns a short pack.
- An empty card set.
- A card set with exactly the number a pack needs.
- An unknown pack type can't compile, and the `switch` is exhaustive.

## Tests

- Unit tests in `packs.test.ts` for each criterion and edge case.
- Property tests in `packs.property.test.ts` for the mix, no repeats, and
  the same seed giving the same pack, over generated card sets and seeds.

## Out of scope

- Coins, free packs and the collection. T-0004 adds them.
- Any change to `random.ts`.
- Animation, text shown to a player and storage.
