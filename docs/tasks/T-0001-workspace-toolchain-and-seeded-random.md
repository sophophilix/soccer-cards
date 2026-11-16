---
id: T-0001
title: Create the pnpm workspace toolchain with a seeded random module in packages/game
component: game
kind: chore
agent: web-implementer
paths:
  - package.json
  - pnpm-workspace.yaml
  - .node-version
  - tsconfig.base.json
  - eslint.config.js
  - prettier.config.js
  - .prettierignore
  - knip.json
  - packages/game/**
dependencies:
  - typescript
  - eslint
  - "@eslint/js"
  - typescript-eslint
  - prettier
  - vitest
  - "@vitest/coverage-v8"
  - fast-check
  - knip
max_changed_lines: 400
status: ready
---

## Goal

The repository has no TypeScript tooling yet. This task creates the workspace
and proves every gate on one small real module, so each later task starts
from a gate that passes.

## Context

- Read ADR 0001 (D1 to D4) and the `ts-standards` skill with
  `references/configs.md`.
- `make check COMPONENT=game` runs `format:check`, `lint`, `typecheck` and
  `test` in `packages/game`, then `pnpm run unused` at the root.
- Nothing depends on this task. Every other task in this plan depends on it.
- Don't use `pnpm dlx` or a project generator. Write the files and add the
  packages with `pnpm add`.

## Acceptance criteria

- `pnpm install --frozen-lockfile` succeeds from a clean checkout.
- The root `package.json` is private, sets `"type": "module"`, names the
  exact pnpm version in `packageManager` and has an `unused` script that
  runs Knip. Tools are root `devDependencies`.
- `pnpm-workspace.yaml` has the packages and the supply chain settings from
  `references/configs.md`, unchanged.
- `.node-version` names a Node version of 22.17 or later that is installed
  on this machine.
- `tsconfig.base.json` has the compiler options from `references/configs.md`.
- ESLint uses the flat config with typescript-eslint `strictTypeChecked` and
  `stylisticTypeChecked`, and the complexity and file-size limits in
  `ts-standards`.
- `packages/game` has the four canonical scripts, and Vitest enforces the
  coverage thresholds in `ts-standards`.
- `packages/game/src/random.ts` exports a seeded random number generator.
  The same seed gives the same sequence. It offers a whole number in a
  range, and a sample of `n` different items from a list.
- `make check COMPONENT=game` passes.

## Edge cases

- A sample of 0 items, of every item, and of more items than the list has.
  The last is an error, not a short result.
- A range of one value.
- A seed of 0 and a negative seed.
- The generator never calls `Math.random` or reads the clock.

## Tests

- Unit tests beside the module in `packages/game/src/random.test.ts`.
- Property tests in `packages/game/src/random.property.test.ts`: the same
  seed gives the same sequence, a whole number stays in its range, and a
  sample has no repeats and only items from the list.

## Out of scope

- `apps/web`, Svelte and Playwright. T-0007 adds them.
- Any game rule. T-0003 to T-0006 add them.
- GitHub Actions workflows and git hooks.
- In the task report, record the exact version of each tool and whether each
  item under "Not yet verified" in `references/configs.md` held. Don't edit
  that file. It is a kit file.
