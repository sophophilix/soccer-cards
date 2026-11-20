---
id: T-0086
title: The logic for opening a pack and saving its cards
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/packs/**
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

- `lib/packs/pack-session.ts` opens a pack with `drawPack` and the game's
  random source (seeded from `crypto.getRandomValues`), saves it as pending,
  gives the reveal order (best last), and adds the cards through the player
  store. Split from the first T-0086 build (598 lines); T-0093 is the view.
- Storage unavailable: the pack still opens and the result says it can't
  be saved.
- `make check COMPONENT=web` passes.

## Edge cases

- A pack the player can't pay for; a double open or add; a card no longer
  in the set.

## Tests

- `pack-session.test.ts` for each criterion and edge case.

## Out of scope

- Coins and pack prices beyond what the game rules already give.
