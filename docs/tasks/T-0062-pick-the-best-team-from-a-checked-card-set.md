---
id: T-0062
title: Pick the best team from a checked card set
component: game
kind: fix
agent: web-implementer
paths:
  - packages/game/src/lineup.ts
  - packages/game/src/lineup.test.ts
  - packages/game/src/lineup.property.test.ts
  - packages/game/src/divisions.ts
  - packages/game/src/divisions.test.ts
  - packages/game/src/testing/**
dependencies: []
max_changed_lines: 120
status: done
---

## Goal

`bestTeam` can't be handed a list that repeats a card, the same way
`lineUp` and `tradeCard` can't after T-0053.

## Context

- T-0053, which made `lineUp` and `tradeCard` take a `CheckedCardSet` and
  stopped before `bestTeam` because its caller is in `divisions.ts`.
- `packages/game/src/lineup.ts`: `bestTeam` takes `readonly Card[]` and
  drops repeated ids with a map.
- `packages/game/src/divisions.ts`: `computerSide` passes `bestTeam` the
  cards it opened, filtered from a checked set.
- Runs after T-0053. Aim for about 60 changed lines.

## Acceptance criteria

- `bestTeam` takes a `CheckedCardSet` and the ids to choose from, and a
  plain list no longer compiles.
- `computerSide` passes the checked set and the ids it opened. Its
  results are unchanged for the same seed.
- `make check COMPONENT=game` passes.

## Edge cases

- An id to choose from that isn't in the set is ignored.
- The same id given twice counts once.

## Tests

- A test in `lineup.test.ts` that a plain list fails to compile, under
  `@ts-expect-error`.
- Unit tests for both edge cases.
- The existing `divisions` tests, including the same-seed test, pass
  unchanged.

## Out of scope

- Any other rule, and the web app.
