---
id: T-0068
title: Stop a waiting approval from holding up the next run, and cache installs
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/deploy.yml
  - .github/workflows/checks.yml
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

A merge to `main` starts its checks and read-only plan at once, even while an
older run waits for the tech lead's approval. Only the jobs that change
production queue. Pull requests finish sooner because installs are cached and
each component's gate runs only when its paths change. No gate, approval or
deploy rule is weakened.

## Context

- Measured on 2026-11-20: the parallel PR checks take about 1.5 to 2 minutes
  (`web` about 90 s). `main` run #5 waited 6.5 minutes in the queue before its
  checks started, because `deploy.yml` has one workflow-level concurrency
  group and an older run was waiting for approval.
- ADR 0002 D3 and D9. The `ci-supply-chain` and `opentofu` skills.
- `deploy.yml` (T-0058, T-0060) and `checks.yml`. The required check names on
  `main` are the job names in `checks.yml`, plus `infra`. They must not change.

## Acceptance criteria

- `deploy.yml` has no workflow-level concurrency group. The `deploy` job and
  the `apply` job each hold a job-level group that never cancels a job in
  progress, so they never run at the same time as another run's same job. A
  newer run's pending job replaces an older pending one.
- The checks call and the `plan` job (read-only, `infra-plan`) start as soon
  as the run starts, whatever else is waiting.
- The head-of-`main` guard stays on `deploy` and `apply`, so an older commit
  can never deploy or apply after a newer one.
- `checks.yml` caches the pnpm store and the Playwright browsers, keyed on the
  lockfile and the Playwright version. A cache is only an optimisation: a
  miss gives the same result, just slower. No cache is shared with, or
  written from, a run that holds a secret.
- `checks.yml` runs each component's job only when that component's paths,
  the lockfile, the workflow or the `Makefile` changed. A job that doesn't
  need to run still reports success under its required name, so the ruleset
  needs no change. On `main` (called from `deploy.yml`) and on the weekly
  schedule, every job always runs.
- The path filter is computed in the workflow with `git diff` against the
  base, or with an action pinned by SHA and listed in this brief. Untrusted
  values (file names) never reach a `run:` script through `${{ }}`.
- `make check COMPONENT=ci` passes, with zizmor clean apart from the
  recorded `self-repository` waiver.

## Edge cases

- A pull request that changes only `docs/` runs `docs` and `sdlc` and
  reports the others as passed in seconds.
- A pull request that changes `pnpm-lock.yaml` runs every TypeScript job.
- A run waiting for approval and a newer merge: the newer run's checks and
  plan finish while the older run still waits. Approving the older run does
  nothing (the head guard) and the newer one deploys after its approval.

## Tests

- No test file. Report actionlint and zizmor output, and the job graph of a
  docs-only pull request and of a web pull request from the PR's own run.

## Out of scope

- T-0067 (the pipeline waiting for scans and analysis), `scans.yml`,
  `analysis.yml` and `infra.yml`.
