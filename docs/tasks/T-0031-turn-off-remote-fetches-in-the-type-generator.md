---
id: T-0031
title: Turn off remote fetches in the type generator
component: schema
kind: fix
agent: web-implementer
paths:
  - packages/schema/package.json
  - packages/schema/scripts/**
  - packages/schema/src/**
dependencies: []
max_changed_lines: 150
status: ready
---

## Goal

Generating types from the schemas never makes a network request, whatever
a schema file says. Today the generator follows a remote `$ref`, and the
design lint is the only guard against one being written.

## Context

- Review finding T-0002 security F1, and the T-0028 security review,
  findings F3 and F4: two ways a `$ref` could reach the generator without
  the lint seeing it.
- `packages/schema/package.json`: the `generate` script calls the `json2ts`
  command line, which has no option to turn off remote resolution.
- `packages/schema/src`: the test that compares the committed types with a
  fresh compile.
- `json-schema-to-typescript` passes `$refOptions` to
  `json-schema-ref-parser`. Read both packages' current documentation for
  the option that turns off the `http` resolver.
- The `ts-standards` skill, "security floor".
- Aim for about 90 changed lines. The limit is 150.

## Acceptance criteria

- `pnpm run generate` produces the same files as today, byte for byte, for
  the schemas on `main`.
- The generator is called in one place, with the `http` resolver turned
  off. The `generate` script and the freshness test both use it.
- A schema with a remote `$ref` makes generation fail with an error that
  names the reference. No request is made.
- A reference to a `.schema.json` file beside the schema still resolves.
- The lint test reads each schema file as text and parses it with
  `JSON.parse`, not through a JSON import.
- `make check COMPONENT=schema` passes.

## Edge cases

- A remote `$ref` nested under a keyword the lint walks, and one under a
  key named `__proto__`.
- A `$ref` to a file outside `schemas/v1`, such as `../../package.json`.
  It fails or is refused; it is never read into a generated type.
- A remote `$id` on a schema. It must not turn a sibling reference into a
  request.

## Tests

- In `packages/schema/src`: a test that starts a listener on 127.0.0.1,
  points a `$ref` at it, runs the generator, and asserts both the error and
  that the listener got no request.
- A test that a `__proto__` key holding a remote `$ref` is reported by the
  lint when the file is read as text.
- The existing freshness test still passes.

## Out of scope

- Any schema file under `schemas/v1`.
- The design lint's rules. T-0028 owns them.
- A new package. If the option can't be set without one, stop and tell the
  lead.
