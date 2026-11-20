---
id: T-0102
title: Declare the formula version in the index schema
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/index.schema.json
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/index-and-credits.test.ts
  - packages/schema/src/generated/**
dependencies: []
max_changed_lines: 80
status: ready
---

## Goal

The index's `formulaVersion`, which the build already writes (T-0098), is
part of the contract (ADR 0005 D10, ADR 0006).

## Acceptance criteria

- `index.schema.json` declares `formulaVersion`: an integer of at least 1,
  with a description. It is required.
- The examples include it, and an example without it fails.
- `make check COMPONENT=schema` passes.

## Tests

- Valid and invalid examples.

## Out of scope

- Reading it in the web app.
