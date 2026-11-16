---
id: T-0005
title: Add same-tier trading that protects a favourite
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/trade.ts
  - packages/game/src/trade.test.ts
  - packages/game/src/trade.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 290
status: done
---

## Goal

A player swaps a card for a different card of the same tier. A starred card
can't be traded away by mistake.

## Context

- The prototype's `trade` function shows the approved behaviour.
- Depends on T-0008, which adds `isFavourite`. Runs after it, because both
  change `index.ts`.
- The rule is pure and takes the random generator as an argument. Follow
  the result shape in `state.ts`.
- The limit is 290. The lead raised it from 250 for the review fix, and rewrote this
  brief to be smaller, and T-0008 took the favourite rules.

## Acceptance criteria

- `tradeCard(state, cardSet, cardId, random)` removes one copy of the card
  and adds one copy of a different card of the same tier.
- The result names the card received.
- A trade of the last copy of a favourite is refused. A trade of a double
  of a favourite is allowed, and the star stays.
- When the last copy of a card leaves, the card leaves the collection.
- The rule doesn't change the state it was given.
- `make check COMPONENT=game` passes.

## Edge cases

- Trading a card the player doesn't own returns a refusal.
- A tier with only one card in the set returns a refusal.
- A card that isn't in the card set returns a refusal.
- The same seed gives the same card received.

## Tests

- Unit tests in `trade.test.ts`, one per criterion and edge case, written
  before the code.
- Property tests in `trade.property.test.ts`, with a fixed fast-check seed:
  the card received has the same tier and a different id, the collection's
  total size doesn't change, and a refused trade leaves the given state
  equal to a snapshot taken before the call.

## Out of scope

- Setting or clearing a star. T-0008 owns that.
- Trading between two players (ADR 0001 D7).
- Any change to `state.ts`, `packs.ts` or `random.ts`.
