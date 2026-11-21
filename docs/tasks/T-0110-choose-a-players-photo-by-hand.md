---
id: T-0110
title: Let a reviewed list replace or remove a player's photo
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/grades/photos.toml
  - data/pipeline/src/soccer_cards_data/grades.py
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/tests/test_grades.py
  - data/pipeline/tests/test_build.py
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

A licensed photo can still be wrong for a children's site. The T-0084
review found Peter Schmeichel's P18 photo is a Carlsberg promotional shot,
with an alcohol brand filling the card (`child-safety-privacy` Content,
`game-data-api` Photos).

## Acceptance criteria

- `grades/photos.toml` maps a Q-id to `{ photo = "avatar", reason = "..." }`
  or `{ photo = "<Commons file name>", reason = "..." }`, loaded and checked
  like `overrides.toml` (a reason is required, an unknown Q-id fails).
- `avatar` publishes no photo for that player. A named file replaces P18
  and still goes through the Commons licence check (T-0079).
- The file ships with one entry: Q182314 (Peter Schmeichel), `avatar`,
  reason "Wikidata's photo is a promotional shot for an alcohol brand".
- `make check COMPONENT=data` passes. No test reaches the network.

## Tests

- Avatar entry; named file entry going through the licence check; missing
  reason; unknown Q-id.

## Out of scope

- Choosing a new photo for Schmeichel.
