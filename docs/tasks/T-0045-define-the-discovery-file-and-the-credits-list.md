---
id: T-0045
title: Define the discovery file and the credits list
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/index.schema.json
  - packages/schema/schemas/v1/credits.schema.json
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/generated/**
  - packages/schema/src/index-and-credits.test.ts
  - packages/schema/src/examples.test.ts
  - packages/schema/src/index.ts
dependencies: []
max_changed_lines: 260
status: ready
---

## Goal

The API says what it holds and which version of the data it is, and it
lists every photo's credit in one place, which the credits page needs.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D7 and D8.
- `docs/decisions/0003-data-photos-and-child-privacy.md`, D3: a credits
  page lists every photo with a link to its Commons page and its licence.
- `player.schema.json`: the `photo` and `attribution` definitions. The
  credits list refers to `attribution` there and does not copy it.
- Runs after T-0044.
- Aim for about 170 changed lines. The limit is 260.

## Acceptance criteria

- `index.schema.json` describes `v1/index.json`: `dataVersion` (a
  whole number that goes up with each data release), `generateTime` (an
  RFC 3339 moment in UTC), and `collections`, a list of the collection
  files, each with its `collectionId`, the `uri` of its list file inside
  the API, its `schemaId` and its `itemCount`.
- `credits.schema.json` describes `v1/credits.json` as
  `{ "credits": [...] }`, capped at 1,000. Each credit has the `player`
  resource name, the photo `uri`, and the photo's `attribution`.
- Every `uri` in both files is a path inside the API, with the same
  pattern a photo `uri` has. No link to another host is possible except an
  attribution's `sourceUri`.
- One invented example of each file sits in `examples/` and is checked by
  the examples test.
- The design lint passes on both schemas with no rule relaxed.
- The generated types exist, and `index.ts` exports them.
- `make check COMPONENT=schema` passes.

## Edge cases

- A `dataVersion` of 0, of 1.5 and a negative one.
- A collection with an `itemCount` of 0. It is valid.
- A credit whose `player` is not a `players/...` name.

## Tests

- `packages/schema/src/index-and-credits.test.ts`: a row per criterion and
  edge case.

## Out of scope

- Writing these files. The data pipeline does that.
- An OpenAPI description.
