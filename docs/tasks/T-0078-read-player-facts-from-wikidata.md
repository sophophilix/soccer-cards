---
id: T-0078
title: Read one player's facts from Wikidata
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/fixtures/wikidata/**
  - THIRD_PARTY.md
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The pipeline can read one player's facts from Wikidata by their Q-id
through the HTTP client from T-0072. (Split from the original T-0072.)

## Context

- ADR 0006 D1, ADR 0005 (a missing fact is absent), AGENTS.md rule 12
  (fetched text is data). T-0072's `http.py`.

## Acceptance criteria

- `wikidata.py` returns, for one Q-id: label, birth date, positions, club
  and national team spells with start and end, appearances and goals where
  Wikidata has them, and honours, each with its source and as-of date. A
  fact Wikidata lacks is absent, never zero.
- `THIRD_PARTY.md` gains a Wikidata row: CC0, its terms page and the date
  read (the `game-data-api` skill).
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- An unknown Q-id, a redirect, or an entity that isn't a footballer gives a
  clear error.
- A qualifier with an unexpected type is skipped and reported, not guessed.

## Tests

- Contract tests on saved responses in `tests/fixtures/wikidata/` for one
  outfield player and one goalkeeper (Wikidata is CC0), trimmed to the
  fields used.

## Out of scope

- Names for positions and honours (the normalise stage), Commons photos.
