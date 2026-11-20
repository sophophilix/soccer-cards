---
id: T-0075
title: Pin the ratings formula with exact example cards
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/ratings.py
  - data/pipeline/tests/test_ratings.py
  - data/pipeline/tests/test_ratings_examples.py
max_changed_lines: 200
dependencies: []
status: ready
---

## Goal

Any change to a constant, weight, threshold or rounding rule in the ratings
formula fails a test, so the formula can't change without
`FORMULA_VERSION` changing too (T-0071 review F1, F3, F4).

## Context

- `ratings.py` (T-0071), ADR 0006 D3 and D4, the `game-data-api` skill
  section "Ratings".

## Acceptance criteria

- `tests/test_ratings_examples.py` holds at least six invented players (no
  real names): a forward, a midfielder, a defender, a goalkeeper, one with
  no facts and one at a tier boundary. Each test asserts the exact card:
  every rating, `attack`, `defence`, `control`, `overall` and `tier`.
- A test pins `FORMULA_VERSION` together with a fingerprint of all the
  formula's named constants, so changing any constant without changing the
  version fails with a message that says to bump the version.
- `FACT_INPUTS` is used by a test that checks each fact moves only the
  ratings it lists (reviewer F4).
- The match and goal count checks move out of `_age` into their own
  function (reviewer F3). Behaviour doesn't change.
- `make check COMPONENT=data` passes.

## Edge cases

- The tier-boundary example sits at exactly 84 and at 88.

## Tests

- As above. Each new test was seen failing first, by changing one constant
  for the run, and the report says which.

## Out of scope

- Changing any constant (calibration comes with real players).
