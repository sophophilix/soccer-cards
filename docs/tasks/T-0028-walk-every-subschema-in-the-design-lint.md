---
id: T-0028
title: Make the schema design lint walk every subschema keyword
component: schema
kind: fix
agent: web-implementer
paths:
  - packages/schema/src/design-lint.ts
  - packages/schema/src/design-lint.test.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

The design lint reports a `$ref`, a `null` type or a bad name wherever a
schema can hold one. Today it follows ten keywords, so a remote `$ref`
under `additionalProperties` passes, and the type generator would fetch it.

## Context

- Review of T-0012, findings F1, F2, F3 and F6.
- `docs/decisions/0005-api-and-schema-design.md`, D4 and D10.
- JSON Schema 2020-12: the full list of keywords that hold a subschema.
- Runs after T-0025. Until this merges, the lint is the only guard against
  a remote `$ref`.
- Aim for about 80 changed lines. The limit is 120.

## Acceptance criteria

- The walk follows every 2020-12 keyword that holds a subschema, including
  `additionalProperties`, `patternProperties`, `prefixItems`, `contains`,
  `dependentSchemas`, `propertyNames`, `unevaluatedProperties`,
  `unevaluatedItems` and the older `definitions`.
- A `$ref` that isn't a local `#/$defs/...` pointer is reported wherever it
  appears in the document, including inside `examples` and `default`.
- `photoUrls` and `urls` are reported, as `url` already is.
- A comment says the count rule can't catch a count named without the
  word, such as `clubGoals`, so that part of D4 rests on review.
- Every schema in `schemas/v1` still returns no problem.
- `make check COMPONENT=schema` passes.

## Edge cases

- A keyword whose value is `true` or `false` in place of a schema.
- A property that is itself named `$ref` or `items` under `properties`. It
  is a property name, not a keyword.
- A `$ref` inside `not`, and under an `if` with no `then`.

## Tests

- `packages/schema/src/design-lint.test.ts`: one table row per subschema
  keyword, each proving a `$ref` and a `null` type under it are reported.
- Rows that name `anyOf`, `else` and `not`, so removing any of them from
  the walk fails a test.
- Rows for `photoUrls` and `urls`.

## Out of scope

- Any schema file. If a schema in `schemas/v1` fails the wider lint, stop
  and tell the lead.
- Turning off remote fetches in the type generator.
