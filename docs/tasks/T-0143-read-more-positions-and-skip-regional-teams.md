---
id: T-0143
title: Map more Wikidata positions and leave regional teams out of the national team choice
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/tests/test_normalise.py
dependencies: []
max_changed_lines: 150
status: ready
---

## Goal

T-0140 couldn't add five well-known players because of two gaps in
`normalise.py`:

- Robert Lewandowski (Q151269) and Kevin De Bruyne (Q357984): their
  Wikidata positions, centre-forward (Q53060) and playmaker (Q23806), aren't
  in `SPECIFIC_POSITIONS`.
- Aitana Bonmatí (Q27995553) and Alexia Putellas (Q4721366): both have
  spells for Spain and for Catalonia, so `current_senior_teams` fails with
  "can't tell the current senior national team".

## Context

- `SPECIFIC_POSITIONS` in `normalise.py`, and T-0109, which added the
  first specific positions.
- `senior_national_teams` and `current_senior_teams` in `normalise.py`.
  The FIFA code comes from P3441 on the team (T-0095, T-0104).
- Catalonia, the Basque Country and similar sides aren't FIFA members and
  have no P3441 code.

## Acceptance criteria

- `SPECIFIC_POSITIONS` maps centre-forward (Q53060) and second striker
  (Q1373011) to `FORWARD`, and playmaker (Q23806) and deep-lying playmaker
  to `MIDFIELDER`. Check each Q-id on Wikidata and write its label in a
  comment, as the existing lines do.
- A national team spell whose team has no FIFA code is not a senior
  national team. Only teams with a code take part in choosing the current
  team.
- A player whose only national spells are teams with no code has no
  `nationalTeamCode`, as for a player with no national team.
- `make check COMPONENT=data` passes.

## Edge cases

- A player with Spain (open) and Catalonia (open): Spain is chosen.
- A player with only Catalonia: no national team code, and no failure.
- A position item that maps to two positions: not possible. Each Q-id maps
  to one.

## Tests

- `test_normalise.py`: each new position, and the three national team cases
  above.

## Out of scope

- Re-running the pipeline and adding the players (a later batch), labels
  (T-0144).
