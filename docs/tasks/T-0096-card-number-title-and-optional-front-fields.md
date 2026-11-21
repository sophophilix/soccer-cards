---
id: T-0096
title: Load each card's number and title, and let the front show missing fields
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/data/**
  - apps/web/src/lib/cards/card-front.ts
  - apps/web/src/lib/cards/CardFront.svelte
  - apps/web/src/lib/cards/CardFront.svelte.test.ts
dependencies: []
max_changed_lines: 260
status: ready
---

## Goal

The card front can show every published player: `lib/data` also gives the
card number and title, and the front shows a sensible blank when the
nation, club or number is absent (T-0094 review F1, F2).

## Context

- T-0094 `card-face-from-summary.ts`, `lib/cards/card-front.ts` and
  `CardFront.svelte`, `player.schema.json` (`cardNumber`, `cardTitle`, a
  retired player has no club).

## Acceptance criteria

- The face fields include the card number and title, checked at the loading
  edge like the rest.
- `CardFront` accepts an absent nation, club and number: no club line for a
  retired player, no number on the shirt when there is none, and no
  invented value anywhere.
- `make check COMPONENT=web` passes, with the card front's component tests
  covering each absent field.

## Edge cases

- A card title at the schema's maximum length.

## Tests

- Unit tests for the new fields; component tests for each absent field.

## Out of scope

- Views (T-0093, T-0087).
