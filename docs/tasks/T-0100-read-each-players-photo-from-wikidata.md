---
id: T-0100
title: Read each player's Commons photo from Wikidata
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/fixtures/wikidata/**
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

The pipeline knows which Commons file is each player's photo (Wikidata
P18), so cards get photos instead of the avatar (T-0083 build finding).

## Acceptance criteria

- `fetch_player` returns the P18 file name when Wikidata has one
  (preferred rank first), absent otherwise; a malformed value is skipped
  and reported.
- The licence check (T-0079) still decides publish or avatar.
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- Several P18 values; none.

## Tests

- Fixture-based.

## Out of scope

- Choosing a different photo by hand.
