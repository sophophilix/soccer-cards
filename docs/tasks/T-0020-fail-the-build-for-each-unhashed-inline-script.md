---
id: T-0020
title: Fail the build for each inline script that has no hash
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/lib/response-headers/**
  - apps/web/node-builtins.d.ts
  - apps/web/vite.config.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

The build stops when any inline script on a built page has no hash in the
page's policy. Today it stops only when a page has an inline script and no
hash at all, so a second, unhashed script builds cleanly and is then
blocked in the browser.

## Context

- Review finding T-0014 F1, against T-0014's third acceptance criterion.
- `apps/web/src/lib/response-headers/script-hashes.ts`, `readScriptHashes`.
- SvelteKit hashes only the scripts it writes. A script added by hand to
  `src/app.html` gets no hash.
- The failure today blocks a script. It never allows one.
- `apps/web` has no `@types/node`. `apps/web/node-builtins.d.ts` declares
  the few Node functions the build uses. Add to it only what the hash
  needs, or use the Web Crypto global and make the build step wait for it.
- Aim for about 60 changed lines. The limit is 120.

## Acceptance criteria

- `readScriptHashes` computes the SHA-256 hash of each inline script on the
  page and refuses the page when any of them is missing from the page's
  policy.
- The refusal keeps the reason `inline-script-without-hash`.
- A page whose inline scripts all have hashes gives the same result as it
  does today.
- `make check COMPONENT=web` passes.

## Edge cases

- Two inline scripts and one hash: refused.
- Two inline scripts and both hashes: accepted.
- A script with a `src` attribute needs no hash.
- An inline script with a `type` that browsers don't run, such as
  `application/json`, needs no hash.
- A page with no inline script and no hash is accepted.

## Tests

- Unit tests in `script-hashes.test.ts`, one per criterion and edge case.

## Out of scope

- `static/_headers`, and any change to `vite.config.ts` beyond calling the
  changed function.
- The 2,000-character limit on one `_headers` line (T-0014 F2). It waits
  for the tech lead's decision.
- A new dependency, `@types/node` included.
