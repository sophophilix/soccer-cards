---
id: T-0087
title: Browse the collection on the Cards screen
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/cards/**
  - apps/web/src/lib/collection/**
  - apps/web/tests/cards.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The Cards screen shows every card the child owns. Opening a card large to
flip it is T-0105 (split from this task's first build, 449 lines).

## Context

- The prototype's Cards view, `lib/cards`, `lib/state/player-store`,
  T-0085's loader. The `sveltekit-web` skill (accessibility). T-0064
  review: check the flip with VoiceOver and add a polite live region if it
  is silent.

## Acceptance criteria

- Owned cards in a grid, sorted by tier then overall, with a count of
  duplicates; an empty collection points to Packs.
- `make check COMPONENT=web` passes, including axe on the screen.

## Edge cases

- A saved card id that's no longer in the set is shown as unknown, not
  dropped from the save.

## Tests

- Unit tests for sorting and counts; an end-to-end test from Packs to
  Cards.

## Out of scope

- Trading and favourites.
- The card dialog (T-0105).
