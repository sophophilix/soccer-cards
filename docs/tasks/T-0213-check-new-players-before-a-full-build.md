---
id: T-0213
title: Check new players' names, teams and positions before a full build
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/src/soccer_cards_data/cli.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_cli.py
dependencies:
  - T-0212
max_changed_lines: 250
status: ready
---

## Goal

A wave 1 batch adds 40 players. `scdata build` fetches every player in the
set before it checks the new ones, so a missing national team code or a bad
position shows up only after 3 to 12 minutes. T-0204 lost seven builds
this way. A quick check of the candidates alone would save most of it.

## Context

- `build.py`: `build` fetches every player, then `_team_codes` and
  `_check_positions` run before any photo download.
- `cli.py`: the `scdata` commands.
- `names.py`: `display_name` checks a label.

## Acceptance criteria

- A new command, `scdata check Q1 Q2 ...`, fetches only the Q-ids given
  and runs the same checks the build runs before downloading photos: one
  senior national team code, a usable position and a plain display name.
- It prints one line per Q-id: either `ok` with the code, position and
  current club, or the reason the build would refuse it. It exits non-zero
  when any Q-id fails.
- It downloads no photo and writes nothing under `data/api` or
  `ids.toml`.
- It uses the same polite client, cache and request limits as the build.
- `scdata build` behaves as now.

## Edge cases

- A Q-id that isn't a person, or doesn't exist.
- The same Q-id given twice.
- A Q-id already in the set: checked like any other.

## Tests

- unit: `test_build.py` or `test_cli.py`, from recorded fixtures: one
  player passes, one fails for no national team code, one for no position,
  and the exit code is non-zero.

## Out of scope

- Grading, photo checks and the published files.
