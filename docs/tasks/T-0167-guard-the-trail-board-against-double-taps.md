---
id: T-0167
title: Guard the Transfer Trail board against a double tap on Check
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/games/transfer-trail/TrailBoard.svelte
  - apps/web/src/routes/games/transfer-trail/TrailBoard.svelte.test.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

The T-0161 review (finding F1, should_fix) found that the board stops a
double tap from skipping the check result by testing `event.detail > 1` on
"Next player". A key press has `detail` 0, so a held Enter on Check can
fire on Next once focus moves there, and a touch browser may not report a
second tap as `detail` 2. The test double-clicks Next, not Check. T-0161
was already at its 400-line ceiling, so the fix is its own task. It starts
after T-0161 merges.

## Context

- `apps/web/src/routes/games/transfer-trail/TrailBoard.svelte` (the Next
  handler and focus move after Check).
- T-0161's brief, edge case: "A double tap on Check can't land on Next
  player and skip the result."

## Acceptance criteria

- After a check, "Next player" (or "Finish round") ignores any activation
  for a short moment, whatever the input: mouse, touch or keyboard,
  including a held Enter.
- The result stays on screen until a deliberate tap on Next.
- A double tap on a club adds it once.

## Edge cases

- With reduced motion the guard still applies; it isn't an animation.
- A child who taps Next after the moment has passed moves on as before.

## Tests

- `TrailBoard.svelte.test.ts`: a double click on Check keeps the result;
  a repeated Enter key on Check keeps the result; a double click on a club
  places it once; Next works after the moment passes (with fake timers).

## Out of scope

- The page (T-0165) and anything outside the board.
