---
id: T-0117
title: Test the Match screen's accessibility and rare states
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/tests/match-guards.spec.ts
dependencies: []
max_changed_lines: 200
status: done
---

## Goal

The Match screen's rarer states and its seeded screens get tests, so a
colour or wording slip there fails the gate. These come from the T-0112
review (F2, F3).

## Context

- Merge T-0112 first. Read `apps/web/tests/match.spec.ts` for how it seeds
  saved state, and `apps/web/tests/a11y/home.spec.ts` for the axe scan in
  light and dark.
- T-0108 did the same for the Packs screen.

## Acceptance criteria

- Axe scans `/match` with a seeded locked collection and with 11 different
  cards, in light and dark mode, with no violations.
- A player in Champions League sees "Champions League · top division".
- Corrupt saved state shows `MatchView`'s `replaced-invalid` notice and the
  locked screen.
- `make check COMPONENT=web` passes.

## Edge cases

- None beyond the criteria. This task adds tests only.

## Tests

- `apps/web/tests/match-guards.spec.ts`: one test per criterion.

## Out of scope

- Any change under `apps/web/src`. If a test finds a real fault, stop and
  tell the lead; the fix is its own task.
