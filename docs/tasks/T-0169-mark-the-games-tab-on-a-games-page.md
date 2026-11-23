---
id: T-0169
title: Mark the Games tab as current on every games page
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/lib/ui/TabBar.svelte
  - apps/web/src/lib/ui/TabBar.svelte.test.ts
  - apps/web/tests/views.spec.ts
dependencies: []
max_changed_lines: 120
status: done
---

## Goal

On `/games/transfer-trail` no tab is marked current, because the tab bar
matches the path exactly (T-0166 report). A child playing a game should
see the Games tab lit, as on `/games`. T-0166 also had to test the page's
title and heading outside the shared `expectView` helper for this reason.

## Context

- `apps/web/src/lib/ui/TabBar.svelte` (`currentPath`, `aria-current`).
- `apps/web/tests/views.spec.ts` (`expectView` and the separate
  `/games/transfer-trail` test T-0166 added).

## Acceptance criteria

- A tab is current on its own path and on any path under it:
  `/games/transfer-trail` marks Games, as `/games` and `/games/` do.
- No other tab changes: `/` still marks Packs, and a path that only starts
  with the same letters (for example `/gamesx`) marks nothing.
- `views.spec.ts` checks `/games/transfer-trail` with the shared
  `expectView` helper, and the separate test from T-0166 goes.

## Edge cases

- A base path from `resolve` is handled as today.

## Tests

- `TabBar.svelte.test.ts`: Games current on `/games/transfer-trail`; no
  tab current on `/gamesx`; the existing cases unchanged.
- `views.spec.ts`: as above.

## Out of scope

- The board (T-0168) and any other page.
