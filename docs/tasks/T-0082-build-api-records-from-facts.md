---
id: T-0082
title: Build each player's API record from facts, grades and the formula
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/tests/test_normalise.py
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

One pure function turns a player's Wikidata facts, grades, override and
photo decision into the `players/{id}.json` and summary objects that
`packages/schema` defines.

## Context

- ADR 0005 (field names, absent not null, slugs, `source` and `asOf`),
  ADR 0006 D3 and D4, `packages/schema/schemas/v1/player.schema.json` and
  its examples. T-0071 `ratings.py`, T-0078 `wikidata.py`, T-0079
  `commons.py`, T-0081 `grades.py`.

## Acceptance criteria

- Slugs come from the display name, lower-case ASCII with hyphens, stable
  for the same input, and collide only with a numeric suffix.
- Position, tier, ratings and play stats come from the formula; the
  override sets the tier when present.
- Club appearances and goals, national team caps and goals carry `source`
  and `asOf`. A missing fact is absent.
- The photo is present only for a publish decision, with its attribution.
- The output validates against the schema in the tests (use the JSON
  Schema files directly).
- `make check COMPONENT=data` passes.

## Edge cases

- A player with no club spells, no photo, or one name only.

## Tests

- Built from the T-0078 fixtures and invented grades; schema-valid; same
  input gives the same output.

## Out of scope

- Writing files and the command (T-0083).
