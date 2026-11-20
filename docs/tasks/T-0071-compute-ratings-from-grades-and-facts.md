---
id: T-0071
title: Compute card ratings from skill grades and facts
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/ratings.py
  - data/pipeline/tests/test_ratings.py
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
dependencies:
  - hypothesis
max_changed_lines: 360
status: ready
---

## Goal

One pure module turns a player's six skill grades and their known facts
into the ratings and play stats on a card (ADR 0006 D3 and D4).

## Context

- ADR 0006 D2 to D4, ADR 0005 D6 (the two rating groups, 1 to 99).
- The `game-data-api` skill, section "Ratings".
- `packages/schema/schemas/v1/player.schema.json`: field names.

## Acceptance criteria

- `ratings.py` exposes `FORMULA_VERSION` and one function that takes a
  position, six grades (1 to 5) for that position's group, and optional
  facts (club appearances, club goals, caps, international goals, birth
  date, as-of date), and returns the six ratings, `attack`, `defence`,
  `control`, `overall` and the tier.
- Every weight and bound is a named constant with a comment saying what it
  does. No number on the 1 to 99 scale is written for a named player.
- With no facts, the result comes from the grades alone.
- Facts move a rating by at most the stated bound, and only the ratings
  ADR 0006 D3 names.
- Tiers follow ADR 0006 D4. An override is an input, not part of the
  formula.
- `make check COMPONENT=data` passes.

## Edge cases

- A grade outside 1 to 5, or a group that doesn't match the position, is
  refused with an error that names the field.
- Zero appearances: no goals-per-appearance adjustment, no division by zero.
- A birth date after the as-of date is refused.

## Tests

- Property tests with Hypothesis: every output is a whole number from 1 to
  99; raising one grade never lowers its rating; adding facts never moves a
  rating past the bound; the same inputs give the same outputs.
- Example tests for each edge case and for the tier boundaries 83, 84, 87
  and 88.

## Out of scope

- Fetching facts (T-0072), grade files, and calibration on real players.
