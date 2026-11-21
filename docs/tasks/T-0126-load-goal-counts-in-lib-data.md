---
id: T-0126
title: Load a card back's goal counts through lib/data with a schema check
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/lib/data/**
  - apps/web/src/lib/cards/CardBack.svelte
  - apps/web/src/lib/cards/card-back.ts
  - apps/web/src/lib/cards/card-back.test.ts
  - apps/web/src/lib/cards/CardBack.svelte.test.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

The card back fetches the player's record itself and narrows the body by hand (T-0124 reviewer F2). The other API reads go through `lib/data` with the schema package.

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- `lib/data/load-card-set.ts` for the pattern; `goalCountsFrom` and the `$effect` in `CardBack.svelte`.

## Acceptance criteria

- A `lib/data` function reads `/api/v1/players/<id>.json`, checks it with the schema package, and returns the two goal counts or nothing.
- `CardBack.svelte` gets the counts through that function and makes no request of its own.
- `make check COMPONENT=web` passes.

## Edge cases

- A missing record, a failed request, or a body that fails the schema shows no goal tiles, as now.

## Tests

- Unit tests for the loader: good body, bad body, failed request, an id that needs encoding.

## Out of scope

- Moving the goal counts into `players.json` (a data pipeline change; security F6 suggests it for privacy, for a later plan).
