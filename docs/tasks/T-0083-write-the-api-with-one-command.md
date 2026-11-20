---
id: T-0083
title: Write and validate the static API with one command
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/src/soccer_cards_data/cli.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_cli.py
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
  - data/pipeline/ids.toml
dependencies:
  - jsonschema
max_changed_lines: 380
status: ready
---

## Goal

`scdata build` runs fetch, licence check, rate, validate and write, and
replaces `data/api/v1/` in one step (the `game-data-api` skill).

## Context

- The `game-data-api` skill sections "The API" and "Pipeline stages", ADR
  0006, `packages/schema/schemas/v1/`.

## Acceptance criteria

- Writes `index.json` (with `FORMULA_VERSION`), `players.json`,
  `players/{id}.json`, `clubs.json`, `credits.json` and `photos/`. Sorted
  keys and lists, fixed formatting, so a rerun with no change gives no diff.
- Every file is validated against its schema before anything is replaced.
  A failed stage leaves the last good output untouched (write to a temp
  folder, then swap).
- A photo file without a complete credit fails the run.
- Slugs are kept in a committed registry (`data/pipeline/ids.toml`) so an
  id never changes or is reused when players are added (ADR 0005 D2).
- `jsonschema` is added with `uv add` and named in `no-build-package` with
  new transitive packages.
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- An empty grades file, a schema failure, and an interrupted write.

## Tests

- A build from fakes into a temp folder: valid, deterministic bytes on a
  second run, and the old output kept when validation fails.

## Out of scope

- Running against live sources (T-0084).
