---
id: T-0145
title: Mark a player retired only when Wikidata's record shows it
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_normalise.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/fixtures/wikidata/**
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

The T-0140 review (F1) found that `normalise.py` sets `state` to `RETIRED`
whenever Wikidata lists no open club spell. Sam Kerr, Steph Catley, Lucy
Bronze and Karim Benzema are published as retired, and none of them is known
to have retired. Wikidata often leaves a current club spell without a start
or with a stale end. A child shouldn't read that a playing star has retired.

## Context

- `normalise.py` line 170: `"state": "ACTIVE" if current else "RETIRED"`.
- ADR 0005 D3 (`state` is `ACTIVE` or `RETIRED`) and D7 (unknown is
  absent).
- Wikidata's "work period (end)" (P2032) records when a sportsperson's
  career ended. Check the property on Wikidata and record its label in a
  comment.
- `.sdlc/reviews/T-0140.reviewer.json` in the main checkout.

## Acceptance criteria

- A player is `RETIRED` when Wikidata has a work period end (P2032), or when
  their latest club or senior national team spell ended at least two full
  calendar years before the run's date.
- A player is `ACTIVE` when they have an open club or senior national team
  spell, or a spell that ended within that window.
- A player with no club or national spells at all is `RETIRED` only with
  P2032. Otherwise they are `ACTIVE`, and the run reports them.
- The run's date comes in as an argument, so tests don't depend on the
  clock.
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- An open national team spell and every club spell closed: `ACTIVE`.
- P2032 present together with an open spell: `RETIRED`, and the run
  reports the conflict.
- A spell's end date with only a year: compare years.

## Tests

- `test_normalise.py`: each rule and edge case above.
- `test_wikidata.py`: P2032 is read from a saved response.

## Out of scope

- Rebuilding `data/api/v1`. The next pipeline run (T-0142) publishes the
  corrected states. Showing `state` on any screen.
