---
id: T-0125
title: Make the masthead read saved state through the store
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/lib/state/player-store.ts
  - apps/web/src/lib/state/player-store.test.ts
  - apps/web/src/routes/+layout.svelte
  - apps/web/tests/masthead.spec.ts
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

The masthead trusts the `soccer-cards:saved` event's `detail` as a `PlayerState` with no check (T-0124 reviewer F1, security F3). Any script on the page could fire it with a bad shape and break the masthead.

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- `SAVED_EVENT` and `announceSaved` in `player-store.ts`; the listener in `+layout.svelte`.

## Acceptance criteria

- The event carries no state. On it, the layout reads the state through `store.load()`, which validates.
- The coins and "Cards (N)" still update right after a pack is added or a match is won.
- `make check COMPONENT=web` passes.

## Edge cases

- An event with any `detail`, or a forged event, changes nothing the store didn't validate.

## Tests

- `player-store.test.ts`: a save fires the event with no detail.
- `masthead.spec.ts`: the coins and card count follow a pack being added, and a forged event with a bad detail doesn't break the masthead.

## Out of scope

- Changing the saved state's shape.
