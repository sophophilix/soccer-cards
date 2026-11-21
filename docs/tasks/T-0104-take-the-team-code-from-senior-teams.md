---
id: T-0104
title: Take the national team code from senior teams only
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/src/soccer_cards_data/http.py
  - data/pipeline/src/soccer_cards_data/cli.py
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_http.py
  - data/pipeline/tests/test_cli.py
  - data/pipeline/tests/test_wikidata.py
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

The first live run (T-0084) failed on Jack Grealish (Q16056053): youth spells
for England and the Republic of Ireland gave two codes. The record already
leaves youth teams out (T-0097); the team-code check must do the same.

## Acceptance criteria

- `_team_code` uses only senior national team spells, with the same youth
  filter `normalise` uses (one shared function, not a copy).
- The check runs for every player before any download and reports every
  failing player in one error, not just the first.
- `scdata build` prints how many requests it made and how long it took,
  on success and on failure.
- `wikidata.py` writes a raw datavalue type with `!a`, like its
  neighbours (T-0099 review F3).
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- Youth spells for two countries and senior spells for one: the senior code.
- Senior spells for two countries: fails, naming the player.
- Only youth spells: fails, naming the player.

## Tests

- The edge cases above with invented facts; two failing players in one error;
  the request count line.

## Out of scope

- Choosing between two senior teams.
