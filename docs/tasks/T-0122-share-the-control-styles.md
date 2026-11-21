---
id: T-0122
title: Share the button, chip and row styles between the views
component: web
kind: refactor
agent: refactorer
paths:
  - apps/web/src/lib/ui/controls.css
  - apps/web/src/app.css
  - apps/web/src/routes/packs/PacksView.svelte
  - apps/web/src/routes/match/MatchView.svelte
  - apps/web/src/routes/match/Penalties.svelte
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

The `.btn`, `.chip` and `.row` styles live in one stylesheet instead of a
copy in each view, so the next screen task doesn't spend its line budget
copying them. Nothing a player sees changes.

## Context

- Merge T-0121 first; it adds an `aria-disabled` button rule to
  `MatchView.svelte`.
- The lead's scan on 2026-11-21: `PacksView.svelte` holds `.row`, `.btn`,
  `.btn.primary` and `.btn:disabled`; `MatchView.svelte` holds the same
  set as `main :global(...)` rules plus `.chip`, `.chip.legend`,
  `.btn[aria-pressed='true']` and `.muted`; `Penalties.svelte` has its own
  `.row`. About 55 lines in `MatchView.svelte` alone. Every Match screen
  task this session ran over its first line estimate, partly from these.
- `apps/web/src/lib/ui/fonts.css` is the existing shared stylesheet, loaded
  by an `@import` in `app.css`. Follow that pattern.
- The `refactoring` skill: no behaviour change, no test change.

## Acceptance criteria

- One `lib/ui/controls.css` holds the shared rules, loaded once for every
  page. The views keep only rules that are theirs alone.
- Every computed style on the Packs and Match screens is unchanged. Where
  the copies differ today (a padding, a colour, a selector), keep the
  difference in the view that has it, or stop and report it; don't pick one.
- No test changes. `make check COMPONENT=web` passes before and after,
  including the axe and tap-target tests.

## Edge cases

- A rule that styles a child component through `:global` must still reach
  it after the move.
- Dark mode and reduced motion keep their rules.

## Tests

- None change. The existing end-to-end, axe and tap-target tests pin the
  look closely enough; report any rule you moved that no test touches.

## Out of scope

- A new design, new tokens or a component library. Moving the styles of
  `MatchStage.svelte`, `PickTeam.svelte` or the Cards view.
