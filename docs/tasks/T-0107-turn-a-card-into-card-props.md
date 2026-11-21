---
id: T-0107
title: Turn a loaded card into the props a card face shows
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/packs/card-props.ts
  - apps/web/src/routes/packs/card-props.test.ts
dependencies: []
max_changed_lines: 160
status: ready
---

## Goal

The Packs screen (T-0093) shows a card from the loader's fields. Split from
T-0093's first build (600 lines).

## Acceptance criteria

- Maps the loader's `cardNumber` to the front's `shirtNumber`, and the
  game's tier and position to the words the card front shows.
- A card with the six ratings gets front and back; one without gets only
  a front.
- `make check COMPONENT=web` passes.

## Tests

- Unit tests for each mapping and for a card with and without ratings.

## Out of scope

- Sharing this with the Cards screen (a later refactor).
