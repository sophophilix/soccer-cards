---
id: T-0175
title: Give the web CI job room to finish as the games' tests grow
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/workflows/checks.yml
dependencies: []
max_changed_lines: 60
status: done
---

## Goal

On 2026-11-23 the `web` job on PR 296 was cancelled at its 10-minute
timeout while Playwright was still running. It wasn't a test failure.
Recent `web` jobs took 6 to 9.1 minutes, and each game adds tests on three
browser projects, so the limit will keep tripping and hold up merges. On
the same day another `web` job failed in its apt step because the Ubuntu
mirror couldn't be reached and `make` at its pinned version couldn't be
installed.

## Context

- `.github/workflows/checks.yml`, the `web` job (`timeout-minutes: 10`, the
  Playwright container, the apt step that installs `make`).
- `ci-supply-chain`: keep actions pinned by digest; no new third-party
  action.
- `apps/web/playwright.config.ts` runs `fullyParallel: true` over three
  projects.

## Acceptance criteria

- The `web` job's `timeout-minutes` is 20, with a comment saying why and
  the job times seen on 2026-11-23.
- The apt step that installs `make` retries the package index fetch (for
  example `apt-get -o Acquire::Retries=3 update`), so a short mirror outage
  doesn't fail the job.
- No other job changes. `actionlint` and `zizmor` stay clean.

## Edge cases

- The pinned `make` version stays as it is.

## Tests

- `make check COMPONENT=ci` passes (actionlint and zizmor).
- The pull request's own `web` job runs green under the new settings; the
  report gives its time.

## Out of scope

- Sharding the Playwright run across jobs. If 20 minutes proves tight, that
  is a later task.
- Any test or app change.
