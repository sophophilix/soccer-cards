---
id: T-0009
title: Change the player schema to the identity fields and enumerations of ADR 0005
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/**
  - packages/schema/src/**
dependencies: []
max_changed_lines: 280
status: done
---

## Goal

The player schema names a player the way ADR 0005 decided, before any data
is built on the old names. This task changes who a player is: the name, the
state, the position and the tier. Ratings and facts change in T-0010 and
T-0011.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D2 to D5 and D7.
- The `game-data-api` skill.
- `packages/schema/schemas/v1/player.schema.json` and
  `packages/schema/src/schema.test.ts` as they are now.
- Checked on 2026-11-16 against AIP-216: the field is `state`, an available
  resource is `ACTIVE`, and no unspecified value is shown to a reader.
- Aim for about 200 changed lines. The limit is 280.

## Acceptance criteria

- A player and a player summary have `name`, matching `players/{player}`
  with the slug rule in D2, in place of the numeric `id`.
- `displayName` is required. `givenName` and `familyName` are optional.
- `state` is required, with `ACTIVE` or `RETIRED`.
- `position` has `GOALKEEPER`, `DEFENDER`, `MIDFIELDER` and `FORWARD`.
- `tier` has `BASE`, `RARE` and `LEGEND`.
- `nationalTeamCode` replaces `country`, with three capital letters.
- `club` holds a resource name matching `clubs/{club}`. It is optional,
  because a retired player has no club.
- `cardNumber` is an optional whole number from 1.
- `updateTime` is required, as an RFC 3339 moment in UTC.
- Every property this task adds or renames has a `description`.
- The generated types are regenerated with `pnpm run generate` and
  committed, and `index.ts` exports them.
- `make check COMPONENT=schema` passes.

## Edge cases

- A slug that starts with a digit or a hyphen, has a capital letter or has
  64 characters is refused. A slug of 63 characters is accepted.
- `ronaldo-1976` is accepted.
- A `name` with a second slash is refused.
- An `updateTime` with an offset other than `Z` is refused.
- A value outside an enumeration is refused by the schema. The description
  tells a reader to treat an unknown value as unknown.

## Tests

- Unit tests in `packages/schema/src/schema.test.ts`, one per criterion and
  edge case, written before the schema change. Test data is invented.
- The test that compares the committed types with fresh output stays.

## Out of scope

- The rating groups (T-0010), and facts, money and the photo (T-0011).
  Leave those fields as they are.
- An `ICON` tier and an `overall` stat. The tech lead has not decided them.
- Club and edition schemas.
- `packages/game`. It keeps its own lowercase tier names.
