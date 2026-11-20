---
id: T-0083
title: Validate the API files against their schemas
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/validate.py
  - data/pipeline/tests/test_validate.py
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
dependencies:
  - jsonschema
max_changed_lines: 200
status: ready
---

## Goal

A validate stage checks every API file against its schema in
`packages/schema/schemas/v1` before anything is written, and fails the run
for a photo without a complete credit. Split from the first T-0083 build
(626 lines); T-0098 builds and swaps, T-0099 adds the registry and command.

## Acceptance criteria

- `validate.py` loads the schemas into a jsonschema registry and validates
  each file; a failure names the file and the field.
- A photo file with no complete credit fails validation.
- `jsonschema` is added with `uv add` and named, with its new packages, in
  `no-build-package`.
- `make check COMPONENT=data` passes.

## Tests

- A valid set, a schema failure, and a stray photo.

## Out of scope

- Writing files (T-0098), the registry and command (T-0099).
