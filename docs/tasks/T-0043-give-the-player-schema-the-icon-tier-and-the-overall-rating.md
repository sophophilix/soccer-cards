---
id: T-0043
title: Give the player schema the Icon tier, the overall rating and a card title
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/player.schema.json
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/generated/**
  - packages/schema/src/schema.test.ts
  - packages/schema/src/player-card-fields.test.ts
  - packages/schema/src/examples.test.ts
dependencies: []
max_changed_lines: 220
status: ready
---

## Goal

The data contract can carry what a version 6 card shows: the Icon tier,
the big overall number on the front, and the short title under the name.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D5, D6 and "Risks and
  open items": a fourth tier is an added enumeration value, and the
  overall rating goes in `playStats`. The tech lead settled both when the
  kids approved prototype version 6 on 2026-11-18.
- `prototype/soccer-cards-prototype.html`: `TIER_NAME`, the `ovr` value
  of `playStats`, and the `edition` text of each player, such as
  "Magician".
- `packages/schema/src/schema.test.ts` is 14 lines under its 400-line lint
  limit. New tests go in `player-card-fields.test.ts`. Change a row in
  `schema.test.ts` only where the new contract makes it false.
- The generated types are written by `pnpm run generate`, never by hand.
- Aim for about 140 changed lines. The limit is 220.

## Acceptance criteria

- `tier` accepts `ICON` beside `BASE`, `RARE` and `LEGEND`.
- `playStats` gains `overall`, a whole number from 1 to 99. It is required,
  like the other three.
- A player and a player summary gain an optional `cardTitle`: plain text
  of 1 to 30 characters, with the same refusals as a photo author (no `<`,
  `>`, control or direction characters, and not blank).
- Each new property has a description. `cardTitle`'s says the project
  writes it and it is not a sourced fact.
- Both examples carry `overall` and a `cardTitle`, and one is an Icon.
- The design lint and the examples test pass with no rule relaxed.
- The generated types are regenerated and committed.
- `make check COMPONENT=schema` passes.

## Edge cases

- `overall` of 0, 100, 84.5 and a string.
- A `cardTitle` of 31 characters, of spaces only, and with a tag.
- A tier value in lower case.

## Tests

- `packages/schema/src/player-card-fields.test.ts`: a row for each
  criterion and edge case, for the player and for the summary.

## Out of scope

- How `overall` and the tier are computed. The data pipeline does that.
- `packages/game`.
- The text of ADR 0005. Only the tech lead edits a decision record.
