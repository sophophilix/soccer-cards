---
id: T-0188
title: Seed the web package's property tests once
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/src/testing/property-seed.ts
  - apps/web/vite.config.ts
dependencies: []
max_changed_lines: 60
status: done
---

## Goal

The web package's property test (`src/lib/match/play-match.property.test.ts`)
draws new random inputs on every run, so it can fail on code that hasn't
changed (ADR 0011 D3). The game package already fixes one seed for every
property test in `packages/game/src/testing/property-seed.ts`. Do the same
for the web package.

T-0189 waits for this, because both change `apps/web/vite.config.ts`.

## Context

- ADR 0011 D3, and `packages/game/src/testing/property-seed.ts` and
  `packages/game/vitest.config.ts` for the pattern to copy.

## Acceptance criteria

- `apps/web/src/testing/property-seed.ts` calls `fc.configureGlobal` with
  one fixed seed.
- `apps/web/vite.config.ts` loads it through `test.setupFiles`, so every
  web test file gets it.
- Two runs of `play-match.property.test.ts` check the same inputs.

## Edge cases

- The setup file runs in browser mode, so it imports nothing from Node.

## Tests

- unit: `src/lib/match/play-match.property.test.ts`: unchanged. It now runs
  with the fixed seed.

## Out of scope

- Any change to a test's body, and the game package.
