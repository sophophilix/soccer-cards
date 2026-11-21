---
id: T-0119
title: Test picking players on the Match screen end to end
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/tests/match-pick.spec.ts
dependencies: []
max_changed_lines: 200
status: done
---

## Goal

The pick screen's taps get end-to-end tests in a real browser. T-0113's
first build was 477 lines, so its end-to-end spec moved here.

## Context

- Merge T-0113 first. Read its brief, `PickTeam.svelte` and
  `apps/web/tests/match-team.spec.ts` for how the screen is seeded.
- A saved copy of the first build's spec may exist; the lead says where.

## Acceptance criteria

- "Your players" lists every owned card once, by line, then highest rating.
- Tapping a player takes them out and tapping again puts them back; the
  chip, lines and Kick off follow.
- A twelfth player changes nothing and shows "You already have 11. Take
  one out first."
- Clear empties the team and shows "Tap players below to fill the team.";
  Pick my best team fills it again.
- A new formation keeps the picked players.
- A double tap on one player never holds them twice.
- Axe scans the screen after Clear, with every player unpicked, in light
  and dark mode, with no violations (T-0113 review F1 and F3).
- `make check COMPONENT=web` passes.

## Edge cases

- None beyond the criteria. This task adds tests only.

## Tests

- `apps/web/tests/match-pick.spec.ts`: one test per criterion.

## Out of scope

- Any change under `apps/web/src`. If a test finds a real fault, stop and
  tell the lead; the fix is its own task.
