---
id: T-0095
title: Read each national team's FIFA code from Wikidata
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/fixtures/wikidata/**
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

The pipeline knows each player's senior national team's FIFA code
(`nationalTeamCode`, required by the schema), read from Wikidata rather
than typed by hand.

## Context

- ADR 0005 D7, T-0078 `wikidata.py` (team items are already fetched).
  Find the property that holds the FIFA code (country for sport, then its
  FIFA country code) before writing.

## Acceptance criteria

- Each national team spell carries its FIFA code when Wikidata has one;
  absent otherwise, and reported.
- The team reply is checked like the player's own: a reply whose
  `entities` isn't a dict is refused, and a team id missing from it (or
  marked missing) is reported in `skipped`, never filed as a club
  (T-0088 review F1).
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- England, Scotland and Wales (no ISO code); a team with no code.

## Tests

- Fixture-based, extended with the needed properties.

## Out of scope

- Choosing a player's main national team (T-0092 takes the senior team).
