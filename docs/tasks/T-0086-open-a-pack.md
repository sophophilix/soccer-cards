---
id: T-0086
title: Open a pack on the Packs screen and add the cards to the collection
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/packs/**
  - apps/web/src/routes/+page.svelte
  - apps/web/src/lib/packs/**
  - apps/web/tests/packs.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

A child taps "Open pack", the cards are revealed one at a time with the
best last, and they join the collection saved on the device.

## Context

- The approved prototype's Packs view, `packages/game` `drawPack` and
  `state`, `lib/state/player-store`, `lib/cards/FlipCard`, T-0085's data
  loader, the `sveltekit-web` and `child-safety-privacy` skills (no
  countdowns, nothing that punishes stopping).

## Acceptance criteria

- The Packs screen shows the pack kinds the player can open and opens one
  with `drawPack`, using the game's random source.
- Cards are revealed one by one with FlipCard, the best last; reduced
  motion shows them without animation.
- The new cards are saved through the player store; a reload keeps them.
- A loading or data error shows a plain message and a retry, never a blank
  screen.
- `make check COMPONENT=web` passes, including axe on the screen.

## Edge cases

- Storage unavailable: the pack still opens and says progress can't be
  saved on this device.

## Tests

- Unit tests for the reveal order and save; an end-to-end test that opens
  a pack and finds the cards after a reload.

## Out of scope

- Coins and pack prices beyond what the game rules already give.
