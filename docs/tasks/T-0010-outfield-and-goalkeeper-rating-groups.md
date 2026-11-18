---
id: T-0010
title: Give a player outfield ratings or goalkeeper ratings by position
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/**
  - packages/schema/src/**
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

A goalkeeper's card shows goalkeeper ratings. The schema gives each player
exactly one rating group, chosen by position, so a reader never sees an
empty or invented rating.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D6.
- Runs after T-0009, which changes the position values.
- Review finding T-0002 F1: the 1 to 99 bound was tested on one field of
  each group only.
- Review finding T-0009 F1: the schema accepts `givenName` with no
  `familyName`, and the reverse. T-0009 was at its size limit, so the fix
  is here.
- The generated type files repeat every description, which took T-0009 to
  its limit. Aim for about 200 changed lines. The limit is 300.

## Acceptance criteria

- `outfieldRatings` replaces `ratings`, with `pace`, `shooting`, `passing`,
  `dribbling`, `defending` and `physical`. `physical` replaces `power`.
- `goalkeeperRatings` has `diving`, `handling`, `kicking`, `reflexes`,
  `speed` and `positioning`.
- A player with position `GOALKEEPER` must have `goalkeeperRatings` and
  must not have `outfieldRatings`. Every other position is the reverse.
- `playStats` stays the same for every player.
- Every rating and play stat is a whole number from 1 to 99, and every
  field in a group is required.
- In `playerSummary`, `givenName` and `familyName` come together: each one
  requires the other (`dependentRequired`).
- Every property this task adds or renames has a `description`.
- The generated types are regenerated and committed.
- `make check COMPONENT=schema` passes.

## Edge cases

- A goalkeeper with both groups, and a player with neither, are refused.
- A forward with `goalkeeperRatings` only is refused.
- 0, 100, 50.5 and a string are refused in every rating and play stat
  field, not in one field per group.
- A group with one field missing is refused, for each field.
- A player with `givenName` only is refused, and so is a player with
  `familyName` only. A player with both, or with neither, is accepted.

## Tests

- Unit tests in `schema.test.ts`, written before the schema change. Loop
  over the field names so each field is tried, with a named table and no
  branch in the test body.

## Out of scope

- The ratings formula. It belongs to the data pipeline.
- An `overall` stat.
- Facts, money and the photo (T-0011).
