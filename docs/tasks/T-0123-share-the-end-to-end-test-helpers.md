---
id: T-0123
title: Share the end-to-end helpers that serve cards and seed a player
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/support/**
  - apps/web/tests/match.spec.ts
  - apps/web/tests/match-guards.spec.ts
  - apps/web/tests/match-team.spec.ts
  - apps/web/tests/match-team-values.spec.ts
  - apps/web/tests/match-pick.spec.ts
  - apps/web/tests/match-play.spec.ts
  - apps/web/tests/match-penalties.spec.ts
  - apps/web/tests/match-notices.spec.ts
  - apps/web/tests/packs.spec.ts
  - apps/web/tests/packs-progress.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The end-to-end specs share one module for serving an invented card set,
saving a player's state and fixing the random seed, instead of a copy in
each file. A new screen's tests then start from the module.

## Context

- Merge T-0121 first; it changes `match-play.spec.ts` and adds
  `match-notices.spec.ts`.
- The lead's scan on 2026-11-21: `serveCards` is copied into 8 specs (8 to
  19 lines each), the saved-state seeding through `STATE_KEY` into 10, and
  the `crypto.getRandomValues` stub via `addInitScript` into the match
  specs. Implementers noted the copying in T-0117, T-0112 and T-0115.
- A spec can't import another spec without registering its tests twice,
  so the helpers go in `apps/web/tests/support/`.
- This is a `chore`, not a `refactor`, because it changes test files.

## Acceptance criteria

- `tests/support/` exports the shared helpers with typed parameters: serve
  a card set (with the four tiers a match needs as an option), save a
  player's state, and fix the seed.
- Each listed spec uses them and keeps its own invented data.
- No test is added, removed or renamed, and no assertion changes. The
  count of Playwright tests is the same before and after; say both counts.
- `make check COMPONENT=web` passes.

## Edge cases

- A spec whose copy differs from the others (extra routes, a different
  response): the helper takes an option, or the spec keeps a small local
  wrapper. Don't change what the spec serves.

## Tests

- The listed specs, unchanged in what they assert.

## Out of scope

- Any file under `apps/web/src`. Specs not listed. New tests.
