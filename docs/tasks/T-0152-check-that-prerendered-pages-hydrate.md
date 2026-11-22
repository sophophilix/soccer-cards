---
id: T-0152
title: Check that each prerendered page hydrates in place instead of redrawing
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/tests/hydration.spec.ts
  - apps/web/src/routes/+layout.svelte
  - apps/web/src/routes/+page.svelte
  - apps/web/src/routes/*/+page.svelte
dependencies: []
max_changed_lines: 150
status: ready
---

## Goal

T-0151 found that when SvelteKit takes over a page after load, it removes
the app's wrapper `<div>` and puts a new one in its place. Hydration
should keep the prerendered nodes and attach to them. Replacing them means
the prerendered work is thrown away, the screen can flash, and a phone does
the rendering twice. This task finds out whether that happens, and why.

## Context

- T-0151's report, recorded in PR 269: a MutationObserver logged the
  wrapper being replaced about 1 time in 8.
- Every page is prerendered (`+layout.ts`, `prerender = true`).
- Svelte 5 replaces nodes when the prerendered markup doesn't match what
  the client renders. Typical causes: values that differ between the build
  and the browser, such as stored state, `Date`, `Math.random` or
  `window`, read during the first render instead of in `onMount`. Use the
  `svelte` plugin's documentation tools to confirm.

## Acceptance criteria

- `tests/hydration.spec.ts` marks the prerendered `<main>` and the
  wrapper with a property before the app starts, for each of the five
  addresses (`/`, `/cards`, `/match`, `/guide`, `/packs` if it differs from
  `/`). It checks that the same nodes are still in the page after
  hydration. It also fails on any Svelte hydration warning in the console.
- If a page redraws, the report names the cause, with evidence, and the
  task fixes it in that page or the layout, without changing what the
  child sees.
- If the cause can't be fixed inside these paths, the test is marked
  `test.fail` with the cause in a comment, and the report says so.
- The spec passes 20 runs in a row with `--repeat-each=20`.
- `make check COMPONENT=web` passes.

## Edge cases

- A page that shows saved state (coins, cards): the prerendered markup
  shows none, so the first client render must show none too, and fill in
  after mount.

## Tests

- `tests/hydration.spec.ts`.

## Out of scope

- Visual changes, new features and other specs.
