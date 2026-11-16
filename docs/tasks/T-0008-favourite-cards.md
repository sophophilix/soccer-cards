---
id: T-0008
title: Let a player mark an owned card as a favourite
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/favourites.ts
  - packages/game/src/favourites.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 200
status: done
---

## Goal

A player stars the cards they love. This task adds the two rules that set
and clear the star. Trading uses the star in T-0005.

## Context

- The star button in the prototype's `openDetail` shows the approved
  behaviour.
- `packages/game/src/state.ts` has `PlayerState` with `favourites` and
  `collection`. Follow its result shape and its style.
- Depends on T-0004, which is merged. T-0005 runs after this task.
- Aim for about 120 changed lines. The limit is 200.

## Acceptance criteria

- `addFavourite(state, cardId)` returns a new state with the card in
  `favourites`.
- `removeFavourite(state, cardId)` returns a new state without it.
- `isFavourite(state, cardId)` answers true or false.
- Neither rule changes the state it was given.
- `make check COMPONENT=game` passes.

## Edge cases

- Marking a card the player doesn't own returns a refusal.
- Marking a card that is already a favourite returns the same favourites,
  with no repeat.
- Removing a mark that isn't there returns a refusal.

## Tests

- Unit tests in `favourites.test.ts`, one per criterion and edge case,
  written before the code.

## Out of scope

- Trading. T-0005 adds it.
- Any change to `state.ts`. If the state's shape must change, stop and tell
  the lead.
- Property tests. The rules have no arithmetic to explore.
