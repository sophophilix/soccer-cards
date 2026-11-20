---
id: T-0053
title: Take only a checked card set in trades and line-ups
component: game
kind: fix
agent: web-implementer
paths:
  - packages/game/src/lineup.ts
  - packages/game/src/lineup.test.ts
  - packages/game/src/lineup.property.test.ts
  - packages/game/src/trade.ts
  - packages/game/src/trade.test.ts
  - packages/game/src/trade.property.test.ts
  - packages/game/src/testing/**
dependencies: []
max_changed_lines: 160
status: done
---

## Goal

A rule that reads the card set can't be handed one with a repeated card
id. Today `lineUp` gives a wrong team for such a set, and `tradeCard`
takes one too.

## Context

- Review of T-0037, finding F1: with a set that repeats one team card's
  id and lacks another, `lineUp` returns the same card in two lines.
  Review of T-0019, suggestions: packs and trades should take only a
  checked set.
- `packages/game/src/cards.ts`: `CheckedCardSet` and `checkCardSet`.
  `drawPack` and `openPlayerPack` already take one.
- Runs after T-0046, which also edits `trade.test.ts`.
- Aim for about 90 changed lines. The limit is 160.

## Acceptance criteria

- `lineUp` and `tradeCard` take the card set as a
  `CheckedCardSet`. A plain list no longer compiles.
- `lineUp` decides "11 different cards from the set" by the ids it finds,
  so its two refusal reasons are right for every checked set.
- The tests build their sets with the checked helper in `testing/`. No
  test changes its meaning.
- A test shows, with `checkCardSet`, that a set with a repeated id never
  reaches these rules: the check refuses it first.
- `make check COMPONENT=game` passes.

## Edge cases

- A team that names a card the set doesn't hold.
- A team that names the same card twice.

## Tests

- `lineup.test.ts` and `trade.test.ts`: the changed set builders, and the
  two edge cases for `lineUp`.

## Out of scope

- `bestTeam`: its caller in `divisions.ts` is outside these paths. T-0062
  does it.

- `index.ts`. No export is added or removed.
- The match, which takes a line-up, not a card set.
