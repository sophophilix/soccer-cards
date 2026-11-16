---
id: T-0007
title: Scaffold the SvelteKit app with a local preview and end-to-end tests
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/**
  - package.json
  - eslint.config.js
  - prettier.config.js
  - .prettierignore
  - knip.json
dependencies:
  - svelte
  - "@sveltejs/kit"
  - "@sveltejs/adapter-static"
  - "@sveltejs/vite-plugin-svelte"
  - vite
  - svelte-check
  - eslint-plugin-svelte
  - prettier-plugin-svelte
  - globals
  - "@playwright/test"
  - "@axe-core/playwright"
  - "@vitest/browser-playwright"
  - vitest-browser-svelte
  - wrangler
max_changed_lines: 400
status: ready
---

## Goal

The tech lead can start the site on a laptop and run automated end-to-end
tests against the built site. This task creates the app with one page and
proves the whole web gate, so each view is added on a working base.

## Context

- Read ADR 0001 (D3, D7, D8), ADR 0002 D5, ADR 0003 D6, and the
  `sveltekit-web` and `ts-testing` skills. `ts-testing` has the section
  "Running the site and the tests locally".
- The `Makefile` targets `dev`, `preview`, `e2e`, `e2e-ui` and `check-web`
  call the app's scripts `dev`, `build`, `preview`, `test:e2e` and the four
  canonical scripts. Match those names.
- Depends on T-0001 and runs after T-0002, because both change `knip.json`.
  Can run at the same time as the game tasks, T-0003 to T-0006.
- Don't use `pnpm dlx`, `npx` or `sv create`. Write the files and add the
  packages with `pnpm add`.
- Install the test browsers with `pnpm exec playwright install chromium
  webkit`.

## Acceptance criteria

- `apps/web` is a SvelteKit 3 app with Svelte 5, `adapter-static` and every
  page prerendered. It has no server code.
- The home page shows the game's name and one line of text. It has a page
  title, a language and one `h1`.
- `make dev` serves the app with hot reload.
- `make preview` builds the app and serves the build with `wrangler dev`,
  with no Cloudflare account or login.
- `apps/web/static/_headers` sets a Content Security Policy that allows only
  the site's own origin, and the other headers in the `cloudflare-infra`
  skill.
- `playwright.config.ts` starts the preview with `webServer`, reuses a
  running one except in CI, keeps a trace on the first retry, and has three
  projects: a phone in Chromium, a phone in WebKit and a desktop in
  Chromium.
- ESLint lints Svelte files with type information, Prettier formats them and
  `svelte-check` passes.
- `make e2e` and `make check COMPONENT=web` pass.

## Edge cases

- The page works with JavaScript turned off, because it is prerendered.
- A path that doesn't exist shows a not-found page.
- The preview port is already in use.
- A missing test browser fails the run with a clear message.

## Tests

- `apps/web/tests/home.spec.ts`: the home page loads and shows its heading.
- `apps/web/tests/a11y/home.spec.ts`: axe finds no violation.
- `apps/web/tests/privacy/requests.spec.ts`: the page requests no other
  host and sets no cookie.
- `apps/web/tests/privacy/headers.spec.ts`: the preview sends the Content
  Security Policy. If `wrangler dev` doesn't apply `_headers`, mark this one
  test as skipped with this task's id and report it. Don't remove it.
- One component test with Vitest Browser Mode, to prove that setup.

## Out of scope

- Any game view, the card component, player state and the service worker.
- `wrangler deploy`, a Cloudflare account, `infra/` and GitHub Actions.
- Importing `packages/game` or `packages/schema`.
- In the task report, record the exact version of each tool, how long
  `make e2e` takes, and whether each item under "Not yet verified" in
  `references/configs.md` held.
