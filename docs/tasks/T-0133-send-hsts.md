---
id: T-0133
title: Send Strict-Transport-Security for this subdomain for a year
component: web
kind: feature
agent: infra-implementer
paths:
  - apps/web/static/_headers
  - apps/web/tests/privacy/headers.spec.ts
dependencies: []
max_changed_lines: 100
status: done
---

## Goal

The live site sends no `Strict-Transport-Security` header, so a first visit typed
without `https://` starts over plain HTTP before the redirect. With HSTS a
browser that has visited once goes straight to HTTPS. The tech lead chose one
year, this subdomain only (2026-11-21, "yes to all" to the lead's
recommendation).

## Context

- ADR 0002 D5 (response headers), the `cloudflare-infra` and `ci-supply-chain`
  skills.
- `apps/web/static/_headers` holds the site's headers; the build adds script
  hashes to its policy line.

## Acceptance criteria

- Every response from the site carries `Strict-Transport-Security: max-age=31536000`
  and nothing more: no `includeSubDomains`, no `preload`.
- The headers test checks it on a page, on the API and on a not-found path.
- `make check COMPONENT=web` passes.

## Edge cases

- The local preview server serves `_headers` as the live site does, so the test
  reads the header there.

## Tests

- `apps/web/tests/privacy/headers.spec.ts`.

## Out of scope

- `includeSubDomains` and `preload`, which would bind every site on
  `dsantmaj.com`.
- Cloudflare zone settings.
