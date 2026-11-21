---
id: T-0134
title: Make Messi and Ronaldo Icons and republish the API
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/grades/overrides.toml
  - data/pipeline/tests/test_published_api.py
  - data/api/**
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The kids asked for Lionel Messi and Cristiano Ronaldo to be Icons. The tech lead
agreed ("yes make them icons"), and ADR 0006 D4 now gives `ICON` to all-time
greats whether retired or still playing.

## Context

- ADR 0006 D4 as amended on 2026-11-21, and the `game-data-api` skill.
- `data/pipeline/grades/overrides.toml`: Q615 is Messi, Q11571 is Ronaldo. Its
  header comment still says Icons go only to retired greats.
- Republish with `scdata build`, as T-0084 did. `data/api/**` is generated; only
  the build writes it.

## Acceptance criteria

- `overrides.toml` gives Q615 and Q11571 `tier = "ICON"`, each with a reason
  naming career honours (for example Ballon d'Or wins, World Cup or European
  titles, records), checked against Wikidata or the player's Wikipedia page.
- The header comment matches ADR 0006 D4 as amended.
- The republished `players.json` and each player's file show both as `ICON`;
  no other player's tier or rating changes.
- `test_published_api.py` asserts both are `ICON`.
- `make check COMPONENT=data` passes.

## Edge cases

- A reason that names one season only is not enough (ADR 0006 D4).

## Tests

- `test_published_api.py` as above.

## Out of scope

- Adding players, changing grades or the formula.
