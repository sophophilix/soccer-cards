---
id: T-0081
title: Grade the first 24 players and list the Icon overrides
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/grades/**
  - data/pipeline/src/soccer_cards_data/grades.py
  - data/pipeline/tests/test_grades.py
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The first playable set: 24 well-known players across the four positions,
each with six 1 to 5 grades and a reason each (ADR 0006 D2), and an
overrides file that makes a few retired greats `ICON` (D4).

## Context

- ADR 0006 D2 and D4, ADR 0003 D1 (no third party's ratings), the
  `game-data-api` skill section "Ratings".
- The pack rules need every tier: at least 8 BASE, some RARE, some LEGEND
  and at least 2 ICON. Pick players so the formula (T-0071) is likely to
  give that spread; the run will show the real spread.

## Acceptance criteria

- `grades/players.toml`: for each player, the Wikidata Q-id, the rating
  group, six grades from 1 to 5 and a one-line reason per grade naming a
  public, checkable fact (a record, a role, a known trait). No number on
  the 1 to 99 scale, and no mention of a video game or card maker.
- `grades/overrides.toml`: each line a Q-id, a tier and a reason.
- `grades.py` loads and checks both files: Q-id format, grade range,
  reason present and plain text, group matches six names, no duplicate
  Q-id, and an override names a player in the set.
- At least 4 goalkeepers, and a mix of active and retired players.
- `make check COMPONENT=data` passes.

## Edge cases

- A reason containing a digit pattern like `91` or a game's name fails the
  check.

## Tests

- The real files load; each check refuses a bad example.

## Out of scope

- Running the pipeline (T-0084).
