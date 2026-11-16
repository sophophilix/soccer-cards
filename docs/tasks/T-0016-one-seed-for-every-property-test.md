---
id: T-0016
title: Set the property test seed once for the game package
component: game
kind: chore
agent: web-implementer
paths:
  - packages/game/vitest.config.ts
  - packages/game/src/testing/**
  - packages/game/src/*.property.test.ts
dependencies: []
max_changed_lines: 80
status: ready
---

## Goal

A new property test can't forget the fixed seed. Four test files each set
it today, and a fifth that leaves it out would check different inputs on
each run.

## Context

- The `ts-testing` skill: a test is deterministic.
- Review finding T-0001 reviewer F2.
- Aim for about 40 changed lines. The limit is 80.

## Acceptance criteria

- One setup file sets the fast-check seed to 20261116, and
  `vitest.config.ts` loads it for every test file.
- No test file calls `fc.configureGlobal`.
- The number and names of the tests are unchanged.
- `make check COMPONENT=game` passes, with coverage still over the
  thresholds.

## Edge cases

- Knip reports no unused file.

## Tests

- No new test. Report the test count before and after.

## Out of scope

- Any change to what a property checks.
- `packages/schema` and `apps/web`, which have no property tests.
