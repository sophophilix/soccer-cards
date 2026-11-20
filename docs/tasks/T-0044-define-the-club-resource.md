---
id: T-0044
title: Define the club resource and its list
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/club.schema.json
  - packages/schema/schemas/v1/clubs.schema.json
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/generated/**
  - packages/schema/src/clubs.test.ts
  - packages/schema/src/examples.test.ts
  - packages/schema/src/design-lint.test.ts
  - packages/schema/src/index.ts
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

A player points to its club by name, and the site needs somewhere to read
what that club is called. This adds the club resource of ADR 0005.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D2, D3, D4 and D8.
- `packages/schema/schemas/v1/player.schema.json` and
  `players.schema.json`: the model. The resource sits under `$defs` in its
  own file, the file's root refers to it, and the list refers to the same
  place, as `players.schema.json` does with `playerSummary`. The design
  lint allows a `$ref` only to a place under `$defs`.
- No crest and no logo, ever (ADR 0003 D1). A club is text.
- Runs after T-0043.
- The first run of this task stopped on three things, now settled here:
  `design-lint.test.ts` pins the list of schema files, so it is in the
  paths; a club accepts a property it doesn't know, as a player does; and
  the edition moved to T-0054 to keep the size down.
- The kit counts the generated files toward the limit.
- Aim for about 220 changed lines. The limit is 300.

## Acceptance criteria

- A club has `name` (`clubs/{club}`), `displayName`, an optional
  `countryCode` (the FIFA three-letter code of its association) and
  `updateTime`.
- `clubs.schema.json` is `{ "clubs": [...] }`, capped at 1,000 items, each
  item the full club.
- An id follows D2: lowercase letters, digits and hyphens, starting with a
  letter, 63 characters at most.
- `displayName` is plain text of 1 to 60 characters, with the refusals a
  photo author has.
- A club accepts a property it doesn't know, as a player does (ADR 0005
  D9 lets a later version add a field).
- One invented example, `club.example.json`, sits in `examples/`. The
  examples test chooses the schema from the file name: `player.*.json` or
  `club.*.json`. A file whose name selects no schema fails the test and is
  named.
- The pinned list in `design-lint.test.ts` names the four schema files,
  and the design lint passes on the two new ones with no rule relaxed.
- The generated types exist for both, a test proves they are fresh, and
  `index.ts` exports the types and the schema paths as it does for a
  player.
- `make check COMPONENT=schema` passes.

## Edge cases

- An id of 64 characters, one that starts with a digit, and one with an
  upper-case letter.
- A list of 1,001 clubs.
- A `countryCode` in lower case, and one of four letters.

## Tests

- `packages/schema/src/clubs.test.ts`: a row per criterion and edge case,
  and the freshness of the two generated files.
- `packages/schema/src/examples.test.ts`: the schema chosen by file name,
  and the unknown file name.

## Out of scope

- The edition. T-0054 adds it.
- A cap on `players.schema.json` or a tighter player `displayName`. Both
  are noted for a follow-up.
- The discovery file and the credits list. T-0045 adds them.
