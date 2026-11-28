---
id: T-0210
title: Find the national team code for players the build refuses today
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_normalise.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/fixtures/**
dependencies: []
max_changed_lines: 300
status: superseded
---

## Outcome (2026-11-28)

Closed without a change. The data-implementer read the five real Wikidata
records. None of the five has a senior national team in `P54`: Russo,
Lavelle and van Domselaar have only youth teams there, and Hampton and
Klaesson have none. Their senior caps aren't recorded as spells. The only way
to code them would be the player's own `P1532` country, which would also let
youth-only players in. That would change the rule that a card needs a senior
national team, so the lead kept the current rule and these players stay out.
A cause the agent found on the way (a club with a stray `P1532` read as a
national team) moves to T-0211.

## Goal

T-0203 had to drop five well-known internationals because `scdata build`
stopped with "needs one national team code: found []": Alessia Russo
(Q27450000), Rose Lavelle (Q22006196), Hannah Hampton (Q62652790), Daphne
van Domselaar (Q56678133) and Kristoffer Klaesson (Q59166026). Four are
women. Each has played for a senior national team. The pipeline should find
their code. The API contract requires `nationalTeamCode` on every player
summary (`player.schema.json`, `$defs/playerSummary`), so a player with
truly no senior national team stays out of the set, as now.

## Context

- `build.py` `_team_codes`: fails the build for any player without exactly
  one code.
- `wikidata.py`: reads the FIFA code from the team item's `P3441`.
- `normalise.py` `senior_national_teams` and `current_senior_teams`.
- `packages/schema/schemas/v1/player.schema.json`: `$defs/playerSummary`
  requires `nationalTeamCode`, and the site leaves out a player without one.
- T-0095, T-0104 and T-0106 set the current rules for the code.

## Acceptance criteria

- The report names why each of the five Q-ids gets no code today, from the
  real Wikidata records (for example a women's team item with no `P3441`,
  or a team not recognised as senior).
- Each cause that applies to a real senior national team is fixed, so the
  pipeline finds the code. A women's team takes its code from its own item
  when it has one. Otherwise it takes the code of the men's senior team of
  the same country, found through Wikidata, never through a list kept by
  hand.
- A player with no senior national team at all still fails the build,
  with a message that names the player. The contract doesn't change.
- A player whose current team can't be told still fails the build, as now.
- No player is added to the set in this task, and the published files
  don't change.

## Edge cases

- A team item with two FIFA codes, or a code that isn't three capital
  letters.
- A player who switched national teams.
- A youth or women's under-age team, which must never count as senior.

## Tests

- unit: `test_wikidata.py` or `test_normalise.py`: a women's national team
  item with no `P3441` gets the code from the men's team of the same
  country, from a recorded fixture.
- unit: `test_build.py`: a player with no senior national team still
  fails the build, naming the player.

## Out of scope

- Adding the five players (a later batch picks them up), positions, clubs.
