---
id: T-0036
title: Open packs with base cards and lucky cards
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/packs.ts
  - packages/game/src/packs.test.ts
  - packages/game/src/packs.property.test.ts
  - packages/game/src/state.ts
  - packages/game/src/state.test.ts
  - packages/game/src/state.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 260
status: ready
---

## Goal

A pack is base cards plus a few lucky cards, as in the approved prototype.
Each lucky card is rolled for its tier, so an Icon is rare but possible in
any pack.

## Context

- `prototype/soccer-cards-prototype.html`: `PACKS`, `ODDS`, `rollTier`,
  `pickMany` and `drawPack`.
- `packages/game/src/packs.ts` holds the older rule, a fixed count per
  tier. This task replaces it.
- Runs after T-0035.
- The test helpers in `testing/` may gain what the new tests need, such as
  a card set with a chosen count per tier. No existing test changes its
  meaning.
- Functions stay pure and take `Random` as an argument.
- Aim for about 170 changed lines. The limit is 260.

## Acceptance criteria

- A standard pack is 8 base cards and 2 lucky cards and costs 5 coins. A
  jumbo pack is 40 base cards and 10 lucky cards and costs 20 coins.
- Each lucky card's tier is rolled out of 100: Rare 85, Legend 12, Icon 3.
  The odds are one exported constant, and they add up to 100.
- Base cards are different from each other. A card repeats only when the
  set has fewer base cards than the pack needs.
- A lucky card is one the pack's lucky cards don't hold yet, when its tier
  has one left. Otherwise it may repeat.
- The pack lists the base cards first, then the lucky cards from Rare to
  Icon, so the best card comes last.
- A rolled tier with no card in the set returns an error result that names
  the tier. A set with no base card does the same. A refusal uses no random
  number.
- The old per-tier mix and its exports are gone.
- `make check COMPONENT=game` passes.

## Edge cases

- A set with 25 base cards and a jumbo pack: 40 base cards come back, each
  card once or twice.
- A set with one Icon and two lucky rolls of Icon in one pack.
- A set with no Legend. Opening is refused before any draw.

## Tests

- Unit tests for each criterion and edge case.
- Property tests: the pack size is always the base count plus the lucky
  count; base cards come before lucky cards; lucky cards are in tier order;
  the same seed gives the same pack; over many seeds every tier in the odds
  appears.

## Out of scope

- Trades and favourites.
- What the computer's team opens. A later task uses this function for it.
