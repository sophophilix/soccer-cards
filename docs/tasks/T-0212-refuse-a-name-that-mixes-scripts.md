---
id: T-0212
title: Refuse a player or club name that mixes writing systems
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/names.py
  - data/pipeline/tests/test_names.py
dependencies: []
max_changed_lines: 150
status: ready
---

## Goal

In T-0204, Wikidata's label for Arda Güler began with a Greek capital alpha
that looks like a Latin "A". `scdata build` published the display name
"Αrda Güler" and the slug `rda-guler`. A look-alike letter puts the wrong
name on a child's card and a broken address on the site. The agent swapped
the player out by hand. The pipeline should refuse such a label instead.

## Context

- `names.py`: `is_plain` checks a label before it becomes a display name or
  a slug. `slugify` folds accents and drops anything that isn't ASCII.
- ADR 0005 D2 (names and slugs) and ADR 0003 (data from Wikidata is
  checked before it's published).

## Acceptance criteria

- A label whose letters come from more than one writing system (for
  example Latin and Greek, or Latin and Cyrillic) is refused with
  `LabelError`, and the message names the Q-id.
- A label in one writing system with accents, such as "Güler",
  "Ødegaard", "Łukasz" or "Mbappé", is still accepted.
- A slug base that loses a letter from the start of the name (the
  `rda-guler` case) can't happen any more, because the label is refused
  first.
- No player or club in the published set is refused. Run the check over
  the committed `data/api/v1` names and report the count.

## Edge cases

- A name with a hyphen, an apostrophe or a full stop, such as
  "N'Golo Kanté" or "W.F.C.".
- A name fully in a non-Latin script: keep today's behaviour and say what
  it is in the report.

## Tests

- unit: `test_names.py`: "Αrda Güler" with a Greek alpha is refused, and
  the message holds the Q-id. "Arda Güler" in Latin is accepted. A
  Cyrillic "а" inside a Latin name is refused.

## Out of scope

- Changing labels on Wikidata, and the build's other checks.
