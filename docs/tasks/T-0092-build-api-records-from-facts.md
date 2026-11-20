---
id: T-0092
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

One pure function turns a player's facts, grades, override and photo into
the summary and full records that `packages/schema` defines (the second
half of the first T-0082 build).

## Context

- ADR 0005, ADR 0006 D3 and D4, T-0082 `names.py`, T-0071 `ratings.py`,
  T-0078 `wikidata.py`, T-0079 `commons.py`, T-0080 `photos.py`.

## Acceptance criteria

- Position, ratings, play stats and tier come from the formula; an
  override, including ICON, sets the tier after `compute_card`.
- Club and national-team goals carry `sourceUri` and `retrieveDate`; a
  total is absent if any spell lacks its count; youth teams are left out.
- Counts over a sane bound are reported and treated as absent.
- The photo is present only for a publish decision, with its attribution.
- `nationalTeamCode` is an input checked against `[A-Z]{3}` (T-0095 reads
  it from Wikidata).
- Tests check the structure the schema requires; full JSON Schema
  validation comes with T-0083.
- `make check COMPONENT=data` passes.

## Edge cases

- No club spells, no photo, a one-word name.

## Tests

- From the T-0078 fixtures and invented grades; same input, same output.

## Out of scope

- Writing files (T-0083).
