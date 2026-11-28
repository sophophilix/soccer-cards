---
id: T-0211
title: Publish the current club of players whose club is missing today
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
status: ready
---

## Goal

T-0203's review (F1, suggestion). Khadija Shaw, Yui Hasegawa, Sam Kerr and
Lucy Bronze publish no current club, although Wikidata shows an open-ended
spell at a club, such as Manchester City W.F.C. (Q3844288). A later team
pack (ADR 0010 D4) can't find players who have no club.

## Context

- `.sdlc/reviews/T-0203.reviewer.json`, finding F1 (in the main checkout).
- The pipeline's rule for a player's current club and how it writes
  `clubs.json`.
- Found by T-0210: `wikidata.fetch_player` treats any `P54` team with a
  `P1532` claim as a national team. Manchester City W.F.C. (Q3844288) has
  a `P1532`, so it is read as a national team with no code, not as a club.
  That is a likely cause. A national team must be told apart from a club
  by more than `P1532`.

## Acceptance criteria

- The report names why each of the four players has no club today, from
  the real Wikidata records.
- Each cause that applies to a real senior club is fixed, so the player's
  current club is published and the club has a record in `clubs.json`.
- Youth, reserve and academy sides are still left out, as ADR 0009 D2 and
  the current rules say.
- No player is added or regraded, and the published files don't change in
  this task. The next batch's build publishes the fix.

## Edge cases

- A player with two open-ended spells, such as a club and a loan club.
- A women's club whose item is not marked as a football club the way men's
  clubs are.

## Tests

- unit: from a recorded fixture, a player with an open-ended spell at a
  women's senior club gets that club as current.
- unit: a youth or reserve side is still left out.

## Out of scope

- National team codes, positions, the site.
