---
id: T-0105
title: Open a card large on the Cards screen and flip it
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/cards/**
  - apps/web/src/lib/collection/**
  - apps/web/tests/cards.spec.ts
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

Tapping a card on the Cards screen (T-0087) shows it large with FlipCard,
so a child can see its back and the photo credit.

## Context

- Split from T-0087's first build; its draft dialog is on
  `feat/T-0087-browse-the-collection` at 5071f56. T-0064 review: check
  the flip with VoiceOver and add a polite live region if it is silent.

## Acceptance criteria

- Tapping a card opens a native dialog with FlipCard; Escape and a close
  button close it and return focus to the tile, on WebKit too.
- The photo credit is on the card back (T-0052) and reachable.
- A card with no ratings shows only its front.
- `make check COMPONENT=web` passes, including axe on the dialog.

## Tests

- An end-to-end test from Cards to the flipped card and back; axe.

## Out of scope

- Trading and favourites.
