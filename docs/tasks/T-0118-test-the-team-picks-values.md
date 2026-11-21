---
id: T-0118
title: Test the pick screen's totals, hints and choice of 11
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/match/match-words.test.ts
  - apps/web/tests/match-team-values.spec.ts
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

The pick screen's numbers and words get exact tests, so a wrong total or
hint fails the gate. These come from the T-0116 review (F1, F2).

## Context

- Merge T-0116 first. Read `apps/web/src/routes/match/match-words.ts` and
  `apps/web/tests/match-team.spec.ts`.
- The game's `bestTeam`, `lineUp`, `sideStrength` and `TACTICS`.

## Acceptance criteria

- `match-words.test.ts`: every tactic has a hint naming the tactic it beats
  and the one it loses to; `lineUpHint` gives the words for 0, 1 and 2 or
  more out of position, and for an empty team.
- `match-team-values.spec.ts` with invented cards: the totals chip shows
  the exact ATT, MID, DEF and GK numbers for one formation and tactic.
- With more than 11 owned cards, the line-up shows the 11 that `bestTeam`
  picks, and not the others.
- `make check COMPONENT=web` passes.

## Edge cases

- None beyond the criteria. This task adds tests only.

## Tests

- The two files above.

## Out of scope

- Any change to `apps/web/src` other than the new test file. If a test
  finds a real fault, stop and tell the lead; the fix is its own task.
