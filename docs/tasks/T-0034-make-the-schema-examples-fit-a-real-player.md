---
id: T-0034
title: Make the schema examples fit a player's state and name a broken file
component: schema
kind: fix
agent: web-implementer
paths:
  - packages/schema/schemas/v1/examples/**
  - packages/schema/src/examples.test.ts
dependencies: []
max_changed_lines: 100
status: ready
---

## Goal

No example contradicts itself. Today both examples are active players with
a club who also carry a career end year. The tech lead chose on 2026-11-18
to make one example a retired player.

## Context

- Review of T-0013, findings F1 and F2.
- `packages/schema/schemas/v1/player.schema.json`: `club` is absent for a
  retired player, and `careerEndYear` is the year of the last senior match.
- All names stay invented, as in T-0013.
- Aim for about 60 changed lines. The limit is 100.

## Acceptance criteria

- The outfield example is an active player: it has a `club` and no
  `careerEndYear`.
- The goalkeeper example is a retired player: it has a `careerEndYear` and
  no `club`.
- The every-field test changes to match: between them, the two examples
  use every optional field, and each example uses every optional field that
  fits its state. A new optional field still fails the test until an
  example carries it.
- A file in the folder that isn't valid JSON fails the test with a message
  that names the file.
- `make check COMPONENT=schema` passes.

## Edge cases

- A field that neither example can carry. The test fails and names it.
- A file that is valid JSON but not an object, such as `[]`.

## Tests

- `packages/schema/src/examples.test.ts`: the changed every-field test,
  and rows for a file that isn't JSON and a file that isn't an object.

## Out of scope

- A schema rule that refuses an active player with an end year. The data
  pipeline's validate stage owns that.
- Examples of clubs, lists and editions.
