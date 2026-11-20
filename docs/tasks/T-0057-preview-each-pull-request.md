---
id: T-0057
title: Upload each pull request as a Worker version and test the preview
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/preview.yml
  - apps/web/playwright.config.ts
  - apps/web/preview-target.ts
  - apps/web/tests/preview-target.spec.ts
dependencies: []
max_changed_lines: 240
status: ready
---

## Goal

Every pull request gets a preview address, and the end-to-end tests,
including the response header tests, run against the real Cloudflare
preview instead of the local one (ADR 0002 D4).

## Context

- ADR 0002 D3, D4, D6, D9 and D10. The `ci-supply-chain` and
  `cloudflare-infra` skills.
- `.github/workflows/checks.yml` for the workflow rules this repository
  follows: actions pinned by SHA with the version in a comment,
  `persist-credentials: false`, timeouts, least permissions, the Playwright
  container pinned by digest.
- `apps/web/playwright.config.ts`: today it builds and serves the site on
  port 8787.
- Read the current Wrangler pages on `wrangler versions upload` and preview
  URLs before writing a command or a key.
- The `preview` environment holds `CLOUDFLARE_API_TOKEN` and the variable
  `CLOUDFLARE_ACCOUNT_ID` (`docs/how-to/set-up-hosting.md`).

## Acceptance criteria

- A new workflow runs on `pull_request` and uses the `preview` environment.
- It builds the site once and uploads it with `wrangler versions upload`.
  It never runs `wrangler deploy`.
- The job sets the environment's `url` to the preview address, so GitHub
  shows it on the pull request. The workflow needs no write permission on
  pull requests.
- The end-to-end tests then run against that address. `playwright.config.ts`
  uses a `PREVIEW_URL` environment variable when it is set and starts no
  local server in that case. Without it, local runs behave as today.
- The choice between `PREVIEW_URL` and a local server is a function in
  `apps/web/preview-target.ts`, next to `preview-port.ts`, so it has a unit
  test. The config only calls it.
- The job is skipped, not failed, for a pull request from a fork or from
  Dependabot, which get no secrets. The skip is visible in the run.
- The report says whether preview URLs work with the `workers.dev` address
  turned off. If they do, say so; the change belongs to a follow-up.
- `make check COMPONENT=ci` passes, and `make check COMPONENT=web` still
  passes locally.

## Edge cases

- The first upload, before any deploy, may fail because the Worker doesn't
  exist yet. Report what Wrangler does. Don't work around it by deploying.
- A preview address is public. That is acceptable for this public site, and
  the report says so.
- Two pushes to one pull request: the older run is cancelled.

## Tests

- `apps/web/tests/preview-target.spec.ts`, in the same style as
  `preview-port.spec.ts`: with `PREVIEW_URL` set, the base URL is its origin
  and there is no local server; without it, the local server and port are
  as today; an address that isn't `https://` (or `http://localhost`) is
  refused with a message that names the rule.
- The Playwright suite then runs against the real preview. Report the first
  run's result on the pull request, with the preview address. That run can
  pass only after T-0058 has deployed the Worker once.

## Out of scope

- Deploying to production (T-0058) and OpenTofu (T-0059, T-0060).
- Adding the job to the required checks. The tech lead changes the ruleset.
