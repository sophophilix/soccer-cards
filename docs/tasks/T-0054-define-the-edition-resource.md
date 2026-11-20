---
id: T-0054
title: Define the edition resource and its list
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/edition.schema.json
  - packages/schema/schemas/v1/editions.schema.json
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/generated/**
  - packages/schema/src/editions.test.ts
  - packages/schema/src/examples.test.ts
  - packages/schema/src/design-lint.test.ts
  - packages/schema/src/index.ts
dependencies: []
max_changed_lines: 260
status: done
---

## Goal

The API can say which set of cards it holds, such as the 2026 edition.
This adds the third resource of ADR 0005.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D2, D3 and D8.
- `club.schema.json` and `clubs.schema.json` from T-0044: copy their
  shape exactly, including the `$defs` layout, the id rule and how
  `examples.test.ts` chooses a schema by file name.
- Runs after T-0044. Split from it to keep each change small.
- Aim for about 180 changed lines. The limit is 260.

## Acceptance criteria

- An edition has `name` (`editions/{edition}`), `displayName`, `year` (a
  whole number from 1900 to 2100) and `updateTime`.
- `editions.schema.json` is `{ "editions": [...] }`, capped at 1,000
  items, each item the full edition.
- `displayName` and the id follow the same rules as a club's.
- An edition accepts a property it doesn't know.
- One invented example, `edition.example.json`, sits in `examples/` and
  the examples test checks it against the edition schema.
- The pinned list in `design-lint.test.ts` names the six schema files, and
  the design lint passes on the two new ones with no rule relaxed.
- The generated types exist, a test proves they are fresh, and `index.ts`
  exports them.
- `make check COMPONENT=schema` passes.

## Edge cases

- A `year` of 1899, of 2101 and of 2026.5.
- A list of 1,001 editions.

## Tests

- `packages/schema/src/editions.test.ts`: a row per criterion and edge
  case, and the freshness of the two generated files.

## Out of scope

- A link from a player to an edition.
