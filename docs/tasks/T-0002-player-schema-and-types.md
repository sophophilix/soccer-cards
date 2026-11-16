---
id: T-0002
title: Define the player JSON Schema and its generated TypeScript types
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/**
  - knip.json
dependencies:
  - ajv
  - json-schema-to-typescript
max_changed_lines: 400
status: done
---

## Goal

The pipeline and the app need one written contract for a player. This task
adds the JSON Schema for the player list and for one player, and the
TypeScript types generated from it.

## Context

- Read ADR 0001 D5, ADR 0003 and the `game-data-api` skill, section "The
  API".
- The fields a card shows are in `prototype/soccer-cards-prototype.html`:
  the `PLAYERS` list, `playStats` and `cardHTML`.
- Depends on T-0001. Can run at the same time as T-0003. Runs before T-0007, because both change `knip.json`.
- `ajv` and `json-schema-to-typescript` are `devDependencies`. No validator
  ships to the browser in this task.

## Acceptance criteria

- `packages/schema/schemas/v1/players.schema.json` describes
  `players.json`, and `player.schema.json` describes `players/{id}.json`.
  Both use JSON Schema draft 2020-12 and refuse unknown required shapes
  while allowing unknown extra fields.
- A player has: a stable `id`, name, club as text, country, position, `tier`
  (`base`, `rare` or `legend`), six ratings and three play stats as whole
  numbers from 1 to 99, and an optional photo path.
- The full player also has optional goals for club and country, an optional
  transfer fee as minor units plus a currency code, and optional awards.
  Each fact that changes over time has `source` and `asOf`.
- A value that isn't known is absent. The schema refuses `null`.
- A script generates `packages/schema/src/generated/` from the schemas, and
  a test fails when the committed types are out of date.
- The package exports the types and the schema file paths, and has the four
  canonical scripts.
- `make check COMPONENT=schema` passes.

## Edge cases

- A rating of 0, 100 or 50.5 is refused.
- A tier outside the three is refused.
- A transfer fee with an amount and no currency is refused.
- A player with no photo, no goals and no awards is valid.
- A name with accents, an apostrophe or a single word is valid.

## Tests

- `packages/schema/src/schema.test.ts`: one valid fixture and one invalid
  fixture for each rule above, checked with Ajv. Fixtures are invented
  players, not real ones.
- The generated-types freshness test.

## Out of scope

- Schemas for `index.json`, `clubs.json` and `credits.json`. They come with
  the data pipeline plan.
- Any file under `data/` or `apps/`.
- The ratings formula.
