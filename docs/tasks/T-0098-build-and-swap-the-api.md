---
id: T-0098
title: Build the API from every stage and swap it in one step
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/src/soccer_cards_data/normalise.py
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

One function joins the built stages, writes the API to a temporary folder,
validates it (T-0083) and swaps it into `data/api/v1/` in one step.

## Acceptance criteria

- Writes `index.json` (with the formula version), `players.json`,
  `players/{id}.json`, `clubs.json`, `credits.json` and `photos/`, with
  sorted keys and lists and fixed formatting.
- A rerun with no change gives identical bytes; a record keeps its
  `updateTime`, and the index its time and version, unless something in it
  changed.
- `build_player` gains the club's Q-id; clubs are keyed by Q-id and
  slugged together.
- A failed stage, a schema failure or an interrupted write leaves the last
  good output in place. An empty grades file fails before anything is
  written.
- `make check COMPONENT=data` passes. No test reaches the network.

## Tests

- Every file written and valid; identical bytes on a rerun; only changed
  times move; old output kept on failure; empty grades.

## Out of scope

- The slug registry and the command (T-0099), photo choice (T-0100).
