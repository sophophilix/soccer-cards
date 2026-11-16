---
id: T-0005
title: Add same-tier trading with protected favourites
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/trade.ts
  - packages/game/src/trade.test.ts
  - packages/game/src/trade.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

A player swaps a card for a different card of the same tier, and can star a
card so it isn't traded by mistake.

## Context

- The prototype's `trade` function and the star button in `openDetail` show
  the approved behaviour.
- Depends on T-0004. Runs after it, because both change `index.ts`.
- Functions are pure and take the random generator as an argument.

## Acceptance criteria

- A trade removes one copy of the chosen card and adds one copy of a
  different card of the same tier, chosen with the random generator.
- The result names the card received.
- A player can mark an owned card as a favourite and remove the mark.
- A trade of the last copy of a favourite is refused with an error result.
  A trade of a double of a favourite is allowed, and the mark stays.
- When the last copy of a card leaves, the card leaves the collection.
- `make check COMPONENT=game` passes.

## Edge cases

- Trading a card the player doesn't own returns an error result.
- A tier with only one card in the set can't be traded. It returns an error
  result.
- Marking a card the player doesn't own returns an error result.
- The same seed gives the same card received.

## Tests

- Unit tests in `trade.test.ts` for each criterion and edge case.
- Property tests in `trade.property.test.ts`: the card received has the same
  tier and a different id, the collection's total size doesn't change, and a
  refused trade returns the same state.

## Out of scope

- Trading between two players. ADR 0001 D7 leaves it for later.
- Any change to `state.ts` beyond importing its types. If the state shape
  must change, stop and tell the lead.
- Text shown to a player.
