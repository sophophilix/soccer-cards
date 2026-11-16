---
id: T-0014
title: Write the inline script hashes into the response header at build time
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/**
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

The Content Security Policy response header stops allowing every inline
script. Today only the `<meta>` tag in each page narrows it, so a file
served without the tag has no protection. This must land before the first
deploy.

## Context

- ADR 0002 D5 and the `cloudflare-infra` skill, "Response headers".
- Review findings T-0007 reviewer F1 and security F1.
- `apps/web/static/_headers`, `apps/web/vite.config.ts` and
  `apps/web/tests/privacy/headers.spec.ts`.
- SvelteKit writes a hash for each inline script into each built page. The
  hash changes with the build, so the header can't be written by hand.
- Aim for about 130 changed lines. The limit is 200.

## Acceptance criteria

- After `pnpm run build`, the `_headers` file in the build output has a
  `script-src` with `'self'` and the hashes of the built pages' inline
  scripts, and no `'unsafe-inline'`.
- The step that writes it runs as part of the build, so `make preview` and
  `make e2e` serve the new header with no extra command.
- The step fails the build when a built page has an inline script and no
  hash is found for it.
- Every other header stays as it is.
- An end-to-end test asserts that the response header has no
  `'unsafe-inline'` in `script-src`, and that an injected inline script is
  blocked.
- `make check COMPONENT=web` passes.

## Edge cases

- Two pages with different hashes: each page's script runs.
- The fallback page `404.html` runs its script.
- A build with no inline script writes `script-src 'self'`.
- The step reads and writes inside the build folder only.

## Tests

- A unit test for the function that reads hashes from built HTML, with
  invented HTML.
- End-to-end tests in `tests/privacy/headers.spec.ts`. Use the keyboard or
  a tap, not a mouse click, because WebKit refuses clicks with the display
  off.

## Out of scope

- The style policy and its announcer hash.
- A new dependency. Node's built-in modules are enough.
- Any change under `infra/` or a deploy.
