---
id: T-0013
title: Keep a checked example of an outfield player and a goalkeeper beside the schema
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/**
dependencies: []
max_changed_lines: 160
status: ready
---

## Goal

A developer or a client sees what a full player looks like, and the example
can't drift from the schema. This is check 3 of ADR 0005 D10.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D10.
- Runs after T-0012, T-0025 and T-0028.
- T-0025 pinned the links: a photo's `sourceUri` is a
  `https://commons.wikimedia.org/wiki/File:...` page, and a fact's
  `sourceUri` is an `https` link on a host of two labels or more.
- `packages/schema/src/schema.test.ts` is at 386 of its 400-line lint
  limit. Put this task's tests in a new test file.
- Aim for about 120 changed lines. The limit is 160.

## Acceptance criteria

- `schemas/v1/examples/` has one full outfield player and one full
  goalkeeper, each using every optional field.
- A test checks every file in the folder against the player schema.
- The players, clubs, authors and sources are invented. No real person's
  name appears.
- `make check COMPONENT=schema` passes.

## Edge cases

- A file in the folder that fails the schema fails the test and names the
  file.
- An empty examples folder fails the test.

## Tests

- In `schema.test.ts` or a new `examples.test.ts`.

## Out of scope

- Examples of lists, clubs and editions.
- Any schema change.
