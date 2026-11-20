---
id: T-0099
title: Keep player ids in a registry and run it all with scdata build
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/ids.toml
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/src/soccer_cards_data/cli.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_cli.py
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

A committed `ids.toml` keeps every published slug so an id never changes or
is reused (ADR 0005 D2), and `scdata build` runs the live pipeline.

## Acceptance criteria

- `ids.toml` maps Q-ids to slugs; a registered slug is kept and never
  reused for another Q-id; new players get new entries.
- `scdata build` wires the live stages through `PoliteClient`, prints what
  it dropped, exits 0 on success and 1 on failure with "output unchanged".
- `make check COMPONENT=data` passes. No test reaches the network.

## Tests

- Registered slugs kept and not reused; CLI exit codes.

## Out of scope

- Running it live (T-0084).
