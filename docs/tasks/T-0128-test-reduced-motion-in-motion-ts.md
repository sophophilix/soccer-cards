---
id: T-0128
title: Test that every GSAP motion stops under reduced motion
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/src/lib/ui/motion.test.ts
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

`lib/ui/motion.ts` has 26% line coverage, and nothing tests that each function stops under reduced motion (T-0124 reviewer F5).

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- Merge #211 first; it adds `playShot`, `replay` and `celebrate`.

## Acceptance criteria

- With `matchMedia` stubbed to reduce: `tearPack` and `replay` resolve at once, `playShot` ends at progress 1 with the word showing, `arrive`, `pop` and `celebrate` start no tween, and `tiltToPointer` doesn't move the card.
- One case for each without reduced motion.
- `make check COMPONENT=web` passes.

## Edge cases

- None beyond the criteria. Tests only.

## Tests

- `motion.test.ts` as above.

## Out of scope

- Any change to `motion.ts`.
