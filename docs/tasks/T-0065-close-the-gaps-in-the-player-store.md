---
id: T-0065
title: Close the gaps the reviews found in the player store
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/lib/state/**
  - eslint.config.js
dependencies: []
max_changed_lines: 160
status: ready
---

## Goal

The player store behaves as its reviews expect in the cases T-0063 had no
room left to test, and no code outside `lib/state` can reach storage.

## Context

- T-0063 and its reviews: `.sdlc/reviews/T-0063.reviewer.json` (round 2
  F1, F3) and `.sdlc/reviews/T-0063.security-reviewer.json` (F1).
- `apps/web/src/lib/state/player-store.ts` and its tests.
- `eslint.config.js`: the storage block T-0063 added. A change there is a
  change to a guarded file: say exactly what changed in the report.
- Aim for about 100 changed lines.

## Acceptance criteria

- A test covers reading `window.localStorage` itself throwing, as when
  site data is blocked: the store reports `not-saving` and the game plays
  on.
- The lint rule also refuses `localStorage`, `sessionStorage` and
  `indexedDB` read from any object, such as
  `document.defaultView?.localStorage`, outside `lib/state`.
- `lib/state` exposes one function that removes every key the store
  owns, including every numbered backup, for a later "Start again" view.
- `make check COMPONENT=web` passes.

## Edge cases

- Three numbered backups exist: all three are gone after the clear.
- A key that isn't the store's, under another prefix, is left alone.
- Storage throws during the clear: the caller is told.

## Tests

- Unit tests in `apps/web/src/lib/state/` for each criterion and edge
  case.
- The report shows the lint rule refusing the new pattern, checked with
  `eslint --stdin`.

## Out of scope

- What happens when an older app opens a newer saved state. That rule is
  the tech lead's to change.
- The "Start again" view itself.
