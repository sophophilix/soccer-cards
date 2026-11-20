---
id: T-0085
title: Serve the API from the site and load it into the game's card set
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/data/**
  - apps/web/vite.config.ts
  - apps/web/svelte.config.js
  - apps/web/tests/data.spec.ts
dependencies: []
max_changed_lines: 360
status: ready
---

## Goal

The site serves `data/api/v1/` from its own origin at `/api/v1/`, and a
module turns `players.json` into the game's checked card set.

## Context

- ADR 0001 D5, ADR 0003 D5 (no request to another host), ADR 0005, the
  `sveltekit-web` skill. `packages/game` `Card` and `checkCardSet`.

## Acceptance criteria

- The build copies `data/api/v1/` into the output so `/api/v1/...` and
  `/api/v1/photos/...` are served by the site with the existing headers.
- `lib/data` fetches `players.json` from the same origin, checks each
  summary at the loading edge, maps UPPER_SNAKE tiers and positions to the
  game's values, and returns a `CheckedCardSet` or a typed error.
- Unknown enum values make that card unknown and leave it out, not crash.
- `make check COMPONENT=web` passes; the privacy tests still find no other
  host.

## Edge cases

- An empty list, a network failure, and a summary missing a required
  field.

## Tests

- Unit tests for the mapping and checks; an end-to-end test that
  `/api/v1/players.json` is served with the site's headers.

## Out of scope

- Screens (T-0086, T-0087).
