---
id: T-0044
title: Define the club and edition resources and their lists
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/club.schema.json
  - packages/schema/schemas/v1/clubs.schema.json
  - packages/schema/schemas/v1/edition.schema.json
  - packages/schema/schemas/v1/editions.schema.json
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/generated/**
  - packages/schema/src/clubs-and-editions.test.ts
  - packages/schema/src/examples.test.ts
  - packages/schema/src/index.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

A player points to its club by name, and the site needs somewhere to read
what that club is called. This adds the club and edition resources of ADR
0005.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D2, D3, D4 and D8.
- `packages/schema/schemas/v1/player.schema.json` and
  `players.schema.json`: the model for names, descriptions, `updateTime`
  and a list that points at a single resource by `$ref`.
- No crest and no logo, ever (ADR 0003 D1). A club is text.
- Runs after T-0043, because both change the examples folder and its test.
- The examples test checks every file against the player schema today. It
  must choose the schema from the file name: `player.*.json`,
  `club.*.json`, `edition.*.json`.
- Aim for about 200 changed lines. The limit is 300.

## Acceptance criteria

- A club has `name` (`clubs/{club}`), `displayName`, an optional
  `countryCode` (the FIFA three-letter code of its association) and
  `updateTime`.
- An edition has `name` (`editions/{edition}`), `displayName`, `year` and
  `updateTime`.
- `clubs.schema.json` is `{ "clubs": [...] }` and `editions.schema.json`
  is `{ "editions": [...] }`, each capped at 1,000 items, each item the
  full resource.
- Ids follow D2: lowercase letters, digits and hyphens, starting with a
  letter, 63 characters at most.
- Display names are plain text with a length cap and the refusals a photo
  author has.
- One invented example of each resource sits in `examples/`, and the
  examples test checks each file against the schema its name selects. A
  file whose name selects no schema fails the test and is named.
- The design lint passes on all four new schemas with no rule relaxed.
- The generated types exist for each, and `index.ts` exports them as it
  does the player types.
- `make check COMPONENT=schema` passes.

## Edge cases

- An id of 64 characters, one that starts with a digit, and one with an
  upper-case letter.
- A list of 1,001 items.
- A club with an unknown property. Refused, as a player is.

## Tests

- `packages/schema/src/clubs-and-editions.test.ts`: a row per criterion
  and edge case.
- `packages/schema/src/examples.test.ts`: the schema chosen by file name,
  and the unknown file name.

## Out of scope

- A link from a player to an edition.
- The discovery file and the credits list. T-0045 adds them.
