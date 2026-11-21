---
id: T-0094
title: Load each card's name, nation, club, photo and ratings in the site
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/data/**
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

`lib/data` returns, alongside the game's card set, the fields the card
faces need: display name, nation code, club name, photo with attribution,
and the six ratings, so FlipCard can show real cards (T-0086 build).

## Context

- T-0085 `load-card-set.ts`, `lib/cards/card-front.ts` and `card-back.ts`
  (what each face needs), `players.json` and `clubs.json` in the schema.

## Acceptance criteria

- One fetch of `players.json` (and `clubs.json` if the club name needs it)
  gives both the checked card set and a map from card id to its display
  fields, checked at the loading edge like the rest.
- A field that fails its check makes only that field absent, never the
  card, unless the card can't be shown at all.
- `make check COMPONENT=web` passes.

## Edge cases

- No photo (the avatar), an unknown club, a missing rating group.

## Tests

- Unit tests from the schema examples and invented players.

## Out of scope

- Views (T-0093, T-0087).
