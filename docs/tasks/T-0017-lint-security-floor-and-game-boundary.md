---
id: T-0017
title: Close the holes in the lint rules for the game boundary and the security floor
component: game
kind: chore
agent: web-implementer
paths:
  - eslint.config.js
  - knip.json
  - packages/game/src/random.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

The lint rules stop what the standards say they stop. Reviewers found four
cases that pass lint today and shouldn't.

## Context

- ADR 0001 D1 and D4, and the `ts-standards` skill, "Compiler and lint
  decisions" and "Security floor".
- Review findings T-0001 reviewer F1 and F3, and security F3, F4 and F5.
- Review finding T-0016 F1: fast-check replaces its whole global
  configuration on each `fc.configureGlobal` call, so one call in a test
  file drops the shared seed for that file with no failure.
- Aim for about 60 changed lines. The limit is 120.

## Acceptance criteria

- In `packages/game`, an import of a Node built-in without the `node:`
  prefix, such as `fs`, is a lint error.
- In `packages/game`, a relative import that leaves the package is a lint
  error.
- `no-eval` and `no-new-func` are errors in every TypeScript and Svelte
  file.
- The override that turns off type-checked rules applies to the config
  files at the repository root only, not to every `.js` file.
- In `packages/game`, a call to `fc.configureGlobal` outside
  `src/testing/property-seed.ts` is a lint error.
- `knip.json` points `$schema` at the installed package, not at another
  host.
- The JSDoc of `createRandom` says that only the low 32 bits of the seed
  are used.
- The gates for `game`, `schema` and `web` all pass. Run and report each.

## Edge cases

- A relative import inside `packages/game` still passes.
- A test file in `packages/game` may still import `vitest` and
  `fast-check`.

## Tests

- No test file changes. For each rule, lint a short probe from standard
  input under a file name in the package, and report the error it gives.

## Out of scope

- An ESLint upgrade. It waits for the minimatch fix.
- A change to any rule's behaviour in `packages/game/src` beyond the
  comment.
