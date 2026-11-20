---
id: T-0103
title: Check the API across files before publishing
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/validate.py
  - data/pipeline/tests/test_validate.py
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

The validate stage runs ADR 0005 D10's checks that one schema can't see
(T-0083 review F3).

## Acceptance criteria

- Ids are unique within each collection, and each file name matches its id.
- Every reference resolves: a player's club and photo, each credit's photo,
  and each summary to its full record.
- Each player's rating group matches its position.
- A failure names the file and the reference.
- `make check COMPONENT=data` passes.

## Tests

- One failing case per check, and a valid set.

## Out of scope

- Unknown files (T-0101).
