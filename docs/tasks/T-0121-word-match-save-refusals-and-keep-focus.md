---
id: T-0121
title: Word each refused match save and keep focus after Skip
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/match/MatchView.svelte
  - apps/web/src/routes/match/MatchStage.svelte
  - apps/web/src/routes/match/Penalties.svelte
  - apps/web/tests/match-notices.spec.ts
  - apps/web/tests/match-play.spec.ts
dependencies: []
max_changed_lines: 200
status: done
---

## Goal

When a match result can't be saved, the Match screen says why, in the same
words as the Packs screen. A keyboard user keeps their place after Skip to
full time. These come from the T-0114 review (round 2 F1, F3), plus a
stronger double-tap test from the T-0120 review (F1).

## Context

- T-0115 is merged; it added `Penalties.svelte`.
- `routes/packs/PacksView.svelte` `SAVE_NOTICES`: `not-saving`,
  `storage-full` and `changed-in-another-tab` each have their own words.
  `MatchView.svelte` shows the `not-saving` words for every refusal.
- The `sveltekit-web` skill: focus is never lost when a control goes away.

## Acceptance criteria

- A refused save shows the notice for its reason: device can't save,
  device full, or the game open in another tab. The words say results, not
  cards, where they differ from Packs.
- After Skip to full time, focus moves to the result panel's heading (or
  the next control), not to the page body.
- In the shoot-out, focus stays on or returns to a corner button while a
  kick shows, and moves to the result when it ends (T-0115 review F1).
- The score board has a role or heading that names it to a screen reader.
- A test fires two Kick off clicks before Svelte flushes and sees one
  match. Removing the guard in `MatchView`'s `kickOff` makes it fail; say
  in the report that you checked this (T-0120 review F1).
- `make check COMPONENT=web` passes.

## Edge cases

- A save refused in another tab: the result still shows, and nothing is
  written.

## Tests

- `match-notices.spec.ts`: one test per refusal reason (stub the storage
  to fail each way), focus after Skip, and the double Kick off.

## Out of scope

- Changing the store's reasons or the Packs screen's words.
