---
id: T-0012
title: Add a test that checks every schema against the design rules of ADR 0005
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/src/**
  - packages/schema/schemas/v1/**
dependencies: []
max_changed_lines: 320
status: done
---

## Goal

A design mistake in a schema fails a test before a reviewer has to notice
it. This is check 1 of ADR 0005 D10.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D4, D5 and D10.
- Runs after T-0011, so the schemas already follow the rules.
- Review finding T-0002 security F1: the type generator can fetch a remote
  `$ref`. A rule here keeps one from being written.
- Aim for about 150 changed lines. The limit was 200 and the tech lead
  raised it to 320 on 2026-11-18.

## Acceptance criteria

- A function walks a schema, including `$defs` and nested properties, and
  returns a list of problems, each with the path of the property.
- It reports a property name that isn't lowerCamelCase or has a run of
  capitals, such as `sourceURI`.
- It reports a `name` property that isn't a resource name pattern.
- It reports an enumeration value that isn't UPPER_SNAKE_CASE.
- It reports a type that allows `null`.
- It reports a property with no `description`.
- It reports a name that breaks the suffix rules in D4: a count that
  doesn't end in `Count`, a name that starts with `is` or `num`, and `url`
  in place of `uri`.
- It reports a `$ref` that points outside the schema folder.
- A test runs it on every file in `schemas/v1` and expects no problem.
- `make check COMPONENT=schema` passes.

## Edge cases

- A property defined under `allOf`, `oneOf`, `if`, `then` or `items` is
  walked too.
- A code such as `ENG` in an example or a pattern is not an enumeration
  value and is not reported.
- An empty schema returns no problem.

## Tests

- Unit tests in a new `design-lint.test.ts`, written first: one small
  invented schema per rule that breaks it, and one that passes them all.
- The schemas change only where the lint finds a real problem.

## Out of scope

- The compatibility check. It needs a first release to compare with.
- Examples (T-0013).
- A new dependency. Plain TypeScript walks a JSON object.
