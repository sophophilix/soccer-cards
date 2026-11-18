---
id: T-0035
title: Give a card its position, its overall rating and the Icon tier
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/cards.ts
  - packages/game/src/cards.test.ts
  - packages/game/src/packs.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 160
status: ready
---

## Goal

The game's card carries what the approved prototype (version 6) plays
with: a position, an overall rating and a fourth tier, Icon. Every later
rule in this plan needs them.

## Context

- `prototype/soccer-cards-prototype.html`: `TIER_ORDER`, `LINES`, and the
  object each `PLAYERS` entry becomes. The kids approved version 6 on
  2026-11-18.
- `packages/game/src/cards.ts`: `Card`, `TIERS` and `checkCardSet`.
- The game does not compute a tier or a rating. Both arrive on the card.
- `packs.ts` types a pack mix as one count per tier, so a fourth tier
  stops it compiling. The first run of this task stopped there; the brief
  now lists the file.
- Aim for about 90 changed lines. The limit is 160.

## Acceptance criteria

- `TIERS` is `base`, `rare`, `legend`, `icon`, in that order: least to
  most rare.
- `Card` has `position`, one of `GK`, `DF`, `MF`, `FW`, and `overall`, a
  whole number from 1 to 99.
- `POSITIONS` is exported, in the order a line-up shows them: `FW`, `MF`,
  `DF`, `GK`.
- The two pack mixes in `packs.ts` gain `icon: 0`, and nothing else in
  that file changes. A pack opens exactly as before. T-0036 replaces the
  mixes.
- The comment on `TIERS` says the order is least to most rare.
- `checkCardSet` refuses a card with an unknown position or tier, and an
  `overall` that is not a whole number from 1 to 99. Each refusal names the
  card id and the field.
- The test helpers in `testing/` build cards with the new fields, so every
  existing test still passes with no change to its meaning.
- `make check COMPONENT=game` passes.

## Edge cases

- `overall` of 0, 100, 84.5 and `NaN`.
- A card set with no Icon. It is valid.

## Tests

- `packages/game/src/cards.test.ts`: a row per new refusal, and a row that
  pins the order of `TIERS` and of `POSITIONS`.

## Out of scope

- Packs, trades and state. They change in later tasks.
- Computing `overall` or a tier from ratings. The data pipeline does that.
