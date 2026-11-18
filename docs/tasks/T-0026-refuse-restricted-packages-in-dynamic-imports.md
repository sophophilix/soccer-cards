---
id: T-0026
title: Refuse the restricted packages in dynamic imports and import types in the game package
component: game
kind: chore
agent: web-implementer
paths:
  - eslint.config.js
dependencies: []
max_changed_lines: 60
status: done
---

## Goal

The game package's lint boundary holds for every way of naming a module.
Today a static import of `svelte` or the web app is refused, and the same
name inside `import()` or an import type passes.

## Context

- Review finding T-0017 round 2 F1.
- The `ts-standards` skill: an import that crosses a package boundary is a
  lint error.
- `eslint.config.js`: the `game/no-import-outside-package` rule and the
  `no-restricted-imports` block for `packages/game`.
- Aim for about 25 changed lines. The limit is 60.

## Acceptance criteria

- In `packages/game`, `import('svelte')`, `import('@sveltejs/kit')` and
  `import('@soccer-cards/web')` are lint errors.
- An import type of each, such as `import('svelte').Component`, is a lint
  error.
- The names come from one list that the static rule and the dynamic check
  share.
- The gates for `game`, `schema` and `web` all pass. Run and report each.

## Edge cases

- A template literal with no expression is read as its string.
- `import('./random.ts')` and an import type of it still pass.
- A test file may still import `vitest` and `fast-check`.

## Tests

- No test file changes. For each form, lint a short probe from standard
  input under the name of an existing file in the package, and report the
  error it gives.

## Out of scope

- `import(name)` with a variable, and a destructured `configureGlobal`.
- A lint-fixture test for the rule.
- An ESLint upgrade.
