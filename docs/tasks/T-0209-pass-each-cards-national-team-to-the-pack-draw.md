---
id: T-0209
title: Pass each card's national team into the site's card set
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/data/load-card-set.ts
  - apps/web/src/lib/data/load-card-set.test.ts
dependencies:
  - T-0208
max_changed_lines: 120
status: ready
---

## Goal

T-0208 lets `drawPack` limit cards from one country, but only for cards
that carry a `nationalTeam`. The site builds its card set from the
published `players.json`, which has `nationalTeamCode`. This task passes
that code into each card, so the limit applies on the site.

## Context

- `apps/web/src/lib/data/load-card-set.ts`: turns the published players
  into the game's `Card`s and calls `checkCardSet`.
- `packages/game/src/cards.ts`: `Card.nationalTeam`, from T-0208.

## Acceptance criteria

- Each card gets `nationalTeam` from the player's `nationalTeamCode`.
- A player with no `nationalTeamCode` gives a card with no `nationalTeam`.
- Nothing else about loading changes.

## Edge cases

- A published code that `checkCardSet` refuses: the loader reports the
  failure as it does for any other invalid field.

## Tests

- unit: `load-card-set.test.ts`: a player with `AUS` gives a card with
  `nationalTeam` `AUS`. A player with no code gives a card without one.

## Out of scope

- `drawPack` itself, the Packs screen and its odds text.
