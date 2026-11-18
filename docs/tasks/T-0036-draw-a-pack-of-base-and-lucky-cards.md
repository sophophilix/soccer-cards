---
id: T-0036
title: Draw a pack of base cards and lucky cards
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/draw-pack.ts
  - packages/game/src/draw-pack.test.ts
  - packages/game/src/draw-pack.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

A pack is base cards plus a few lucky cards, as in the approved prototype.
Each lucky card is rolled for its tier, so an Icon is rare but possible in
any pack. This task adds the new rule beside the old one. Nothing uses it
yet.

## Context

- `prototype/soccer-cards-prototype.html`: `PACKS`, `ODDS`, `rollTier`,
  `pickMany` and `drawPack`.
- `packages/game/src/packs.ts` holds the older rule, a fixed count per
  tier. It stays untouched here. T-0041 moves the player's state to the
  new rule and T-0042 removes the old one. The first run of this task
  showed that replacing it in one change is about 570 lines.
- The new function takes a `CheckedCardSet`, so it never meets a repeated
  card id and needs no rule for one.
- `PackKind` is imported from `packs.ts` for now.
- Runs after T-0035. Functions are pure and take `Random` as an argument.
- Aim for about 230 changed lines. The limit is 300.

## Acceptance criteria

- `drawPack(cardSet, kind, random)` returns the card ids of a pack, or an
  error result.
- A standard pack is 8 base cards and 2 lucky cards. A jumbo pack is 40
  base cards and 10 lucky cards. The contents are one exported constant,
  and a function returns a kind's size: 10 and 50.
- Each lucky card's tier is rolled out of 100: Rare 85, Legend 12, Icon 3.
  The odds are one exported constant, and a test proves they add up to 100.
- Base cards are different from each other. A card repeats only when the
  set has fewer base cards than the pack needs, and then no card appears
  more than one time above any other.
- A lucky card is one the pack's lucky cards don't hold yet, when its tier
  has one left. Otherwise it may repeat.
- The pack lists the base cards first, then the lucky cards from Rare to
  Icon, so the best card comes last.
- Every tier is checked before any draw. A set with no card of a tier
  returns `{ ok: false, reason: 'not-enough-cards', tier }`, naming the
  first such tier in the order of `TIERS`. A refusal uses no random number.
- `drawPack` and its constants are exported from `index.ts`. No existing
  export or test changes.
- `make check COMPONENT=game` passes.

## Edge cases

- A set with 25 base cards and a jumbo pack: 40 base cards come back, each
  card once or twice.
- A set with one Icon and two lucky rolls of Icon in one pack.
- A set with no Legend, and a set with no Icon. Each is refused before any
  draw: neither `nextInt` nor `sample` is called.
- A set with exactly one card in each tier.

## Tests

- `draw-pack.test.ts`: a unit test for each criterion and edge case, with a
  stub `Random` to force each roll.
- `draw-pack.property.test.ts`: the pack size is always the kind's size;
  base cards come before lucky cards; lucky cards are in tier order; every
  id is in the set; the same seed gives the same pack; over many seeds
  every tier in the odds appears.

## Out of scope

- `packs.ts`, `state.ts` and their tests. T-0041 and T-0042 change them.
- What a pack costs.
