---
id: T-0084
title: Run the pipeline and publish the first 24 players
component: data
kind: feature
agent: data-implementer
paths:
  - data/api/v1/**
  - data/pipeline/ids.toml
  - data/pipeline/tests/test_published_api.py
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

`data/api/v1/` holds the first 24 players with their photos and credits,
fetched live by an agent (ADR 0006 D6).

## Context

- ADR 0003 D4 and ADR 0006 D1, D6: few, sequential requests with the
  project's User-Agent. Run `uv run --frozen scdata build` from
  `data/pipeline` (T-0083, T-0098, T-0099, T-0101, T-0103).
- The kit treats `data/api/**` as generated: it can't be edited by hand
  and doesn't count towards the line limit. The run also fills
  `ids.toml`, which is counted.

## Acceptance criteria

- The output was produced only by `scdata build`, never edited by hand.
- The tier spread lets `drawPack` run: at least 8 BASE and at least one
  each of RARE, LEGEND and ICON. If not, stop and report the spread.
- `test_published_api.py` checks the committed files against the schema,
  that every photo has a credit, and the tier spread.
- The report lists the request count and time, and every player with an
  avatar instead of a photo and why.

## Edge cases

- A player Wikidata can't resolve: the run fails and names the Q-id.

## Tests

- `test_published_api.py` as above.

## Out of scope

- Changing grades (feedback comes after release).
