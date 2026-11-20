---
id: T-0050
title: Check a saved player state and migrate it to the current version
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/state/**
  - apps/web/package.json
  - pnpm-lock.yaml
dependencies:
  - '@soccer-cards/game'
max_changed_lines: 300
status: done
---

## Goal

A saved state is trusted only after it is checked and brought up to the
current version. This is the first half of keeping progress on the device;
T-0063 stores it. The first build of the whole came to 483 lines against
380, so it was split.

## Context

- `docs/decisions/0001-stack-and-repository-layout.md`, D6. The
  `sveltekit-web` skill, "Player state".
- `packages/game/src/state.ts`: `PlayerState`, `STATE_VERSION` (2 since
  T-0047) and `createPlayerState`. `packages/game/src/divisions.ts`:
  `DIVISIONS`. `recordWin` throws for an unknown division, so the check
  must refuse one (T-0047 reviews, both F1).
- `@soccer-cards/game` becomes a workspace dependency of the web app. It is
  this repository's own package, not a download.
- The first build is on `feat/T-0050-keep-the-players-progress-on-the-device`
  at 5343959. Keep its check and migrations; the store moves to T-0063.
- Aim for about 240 changed lines without the lockfile.

## Acceptance criteria

- A function takes unknown parsed JSON and returns either a version 2
  `PlayerState` or a reason it was refused. It refuses a wrong type, a
  missing field, a negative count, a card count that isn't a whole number,
  an empty card id, and a `division` that isn't one of `DIVISIONS`. The
  division wins, wins and losses are whole numbers of zero or more.
- A state from an older version runs through the migrations in order
  before the check. The list is empty; the mechanism is tested with an
  invented one. A migration that doesn't move up exactly one version is
  refused.
- A version newer than the app knows is refused with its own reason.
- Nothing here touches storage.
- `make check COMPONENT=web` passes.

## Edge cases

- `null`, a list, a number or a string where the state should be.
- A collection that is a list instead of an object.
- An older version with no migration to it.

## Tests

- Unit tests in `apps/web/src/lib/state/` for each refusal and each edge
  case, as a table.
- Migration tests with an invented 0 to 1 to 2.
- A property test: any valid state passes the check unchanged.

## Out of scope

- Storage, the store, two tabs, the lint rule and the end-to-end test:
  T-0063.
- A migration from version 1. No version 1 state was ever saved on a
  device.
