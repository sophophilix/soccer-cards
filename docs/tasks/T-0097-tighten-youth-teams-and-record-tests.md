---
id: T-0097
title: Recognise more youth teams and test the record choices
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/tests/test_normalise.py
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

Close T-0092's open review findings: youth and reserve teams are
recognised by more label forms, and the record's choices are tested.

## Acceptance criteria

- The youth filter recognises "Under-21s", "U23", "Juvenil", "Youth",
  "Academy", "Reserves" and "B team" style labels, case-insensitively,
  without catching senior teams whose names contain those letters.
- Tests cover: the current club and the source date ignore youth spells;
  a player with more than one senior national team; the photo's width,
  height, type, author and licence in the record.
- `make check COMPONENT=data` passes.

## Tests

- As above, with invented labels.

## Out of scope

- Slugs and clubs (T-0083).
