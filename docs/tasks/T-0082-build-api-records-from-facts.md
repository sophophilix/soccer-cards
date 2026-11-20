---
id: T-0082
title: Make safe names and stable slugs for players and clubs
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/names.py
  - data/pipeline/tests/test_names.py
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

Player and club names from Wikidata become safe display names and stable
slugs (ADR 0005 D2). Split from the first T-0082 build (506 lines);
T-0092 builds the records with these.

## Context

- ADR 0005 D2 (ids never change), the `player.schema.json` patterns. The
  T-0078 security review: labels are text anyone can edit.

## Acceptance criteria

- `names.py`: `slugify`, `assign_slugs` (Q-id order, collisions get a
  numeric suffix), `display_name`, and a label check: plain text under the
  schema's pattern, single-spaced, at most 60 characters. A bad label
  raises an error naming the Q-id.
- `make check COMPONENT=data` passes.

## Edge cases

- One-word names, accented names, a name with no letters, long names.

## Tests

- `test_names.py` for each function and each refused label.

## Out of scope

- Building records (T-0092), the slug registry (T-0083).
