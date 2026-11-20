---
id: T-0087
title: Browse the collection on the Cards screen and flip any card
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/cards/**
  - apps/web/src/lib/collection/**
  - apps/web/tests/cards.spec.ts
dependencies: []
max_changed_lines: 380
status: ready
---

## Goal

The Cards screen shows every card the child owns, and tapping one shows it
large with FlipCard so they can see the back.

## Context

- The prototype's Cards view, `lib/cards`, `lib/state/player-store`,
  T-0085's loader. The `sveltekit-web` skill (accessibility). T-0064
  review: check the flip with VoiceOver and add a polite live region if it
  is silent.

## Acceptance criteria

- Owned cards in a grid, sorted by tier then overall, with a count of
  duplicates; an empty collection points to Packs.
- Tapping a card opens a dialog with FlipCard; Escape and a close button
  close it and return focus.
- Credits for each photo are on the card back (T-0052) and reachable.
- `make check COMPONENT=web` passes, including axe on the screen and the
  dialog.

## Edge cases

- A saved card id that's no longer in the set is shown as unknown, not
  dropped from the save.

## Tests

- Unit tests for sorting and counts; an end-to-end test from Packs to
  Cards to the flipped card.

## Out of scope

- Trading and favourites.
