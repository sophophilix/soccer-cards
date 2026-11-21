---
id: T-0127
title: End a save replay when the shot changes
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/match/MomentScene.svelte
  - apps/web/src/routes/match/MomentScene.svelte.test.ts
  - apps/web/src/lib/ui/motion.ts
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

If Skip to full time or a penalty kick changes the shot during a replay, the old timeline is killed, `replay()` never resolves, and the button stays on "Replaying…" with the match held (T-0124 reviewer F3).

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- Merge #211 first; this fixes its `MomentScene.svelte`.

## Acceptance criteria

- A new shot during a replay ends the replay: the button returns and the match is no longer held.
- `make check COMPONENT=web` passes.

## Edge cases

- Replay pressed twice: one replay.

## Tests

- `MomentScene.svelte.test.ts`: start a replay, change the shot, and see `onReplay(false)` and the button back.

## Out of scope

- Changing how a shot looks.
