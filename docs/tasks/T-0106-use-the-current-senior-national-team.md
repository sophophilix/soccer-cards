---
id: T-0106
title: Use a player's current senior national team
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_normalise.py
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

A player who changed national team shows the team they play for now. The
second live run (T-0084) failed on Declan Rice (Q30007142): senior spells
for Ireland, then England. No ADR rule chooses between two senior teams.

## Acceptance criteria

- With more than one senior national team, the code and the national team
  counts come from the current one: the spell with no end date, or, if every
  spell has ended, the one that ended last.
- The other senior spells are reported in the build's dropped list, naming
  the player and the team.
- Two senior spells with no end date, or no dates to compare, still fail,
  naming the player.
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- Ireland then England (Rice): ENG, England's caps and goals.
- Two spells without an end date: fails.

## Tests

- The cases above with invented facts.

## Out of scope

- Overrides by hand.
