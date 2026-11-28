---
id: T-0142
title: Publish each player's career spells and every club they played for
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_normalise.py
  - data/pipeline/tests/test_published_api.py
  - data/pipeline/tests/fixtures/**
  - data/pipeline/ids.toml
  - data/api/v1/**
dependencies: []
max_changed_lines: 400
status: done
---

## Goal

The published files carry each player's clubs, years, games and goals
(ADR 0009 D2). The pipeline reads them already in `wikidata.py` as `Spell`
records and publishes only the totals.

## Context

- Start only after T-0140 and T-0141 are merged. This task rebuilds
  `data/api/v1` with the 64 players and needs the schema field.
- ADR 0009 D2, ADR 0005 D2 and D7, ADR 0006 D1.
- `wikidata.py` builds `Spell` with `start`, `end`, `appearances` and
  `goals`. Club spells are in `clubs`, national ones in `national`.
- `build.py` writes `clubs.json` from the players' current clubs, and
  `ids.toml` keeps club slugs stable. T-0097 recognises youth teams.

## Acceptance criteria

- Each player record has `careerSpells`, oldest first, when Wikidata has
  at least one senior club spell. A player with none has no field.
- Youth and reserve sides are left out, by the same rule the national team
  code uses.
- A spell with no start year is dropped and named in the run's report.
- A spell whose end year is before its start year is dropped and reported.
- Counts carry the player's Wikidata revision as `sourceUri` and the read
  date as `retrieveDate`, like `clubGoalCount`.
- Every club named in any spell has a record in `clubs.json`, with a slug
  kept in `ids.toml`.
- The output is produced only by `scdata build`.
- The report lists how many players have spells, how many spells have
  games and goals, and every dropped spell.
- `make check COMPONENT=data` passes.

## Edge cases

- Two spells at one club, for example a player who came back: two items.
- A spell that is still running: no `endYear`.
- A club Wikidata names without a label in English: the club is reported
  and its spell dropped.

## Tests

- `test_normalise.py`: ordering, youth sides left out, a missing start
  year, an end before the start, two spells at one club.
- `test_build.py`: a spell's club is added to `clubs.json`.
- `test_published_api.py`: the committed files match the schema, and every
  spell's club is in `clubs.json`.

## Out of scope

- Club colours (a later brief for club pages), national team spells, loans,
  the site.
