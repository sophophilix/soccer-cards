---
id: T-0074
title: Scan and update the pipeline's Python dependencies
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/scans.yml
  - .github/dependabot.yml
  - osv-scanner.toml
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

A known vulnerability in a package locked in `data/pipeline/uv.lock` fails
CI the same way one in `pnpm-lock.yaml` does, and Dependabot proposes
updates for the uv project (T-0073 reviews F1 and F2).

## Context

- The `ci-supply-chain` skill, gates table and "Dependencies".
- `scans.yml` runs OSV-Scanner on `pnpm-lock.yaml` only, with a check that
  the scanner read every package the lockfile resolves.
- `.github/dependabot.yml` says to add uv once `data/` exists.

## Acceptance criteria

- The `dependencies` job also scans `data/pipeline/uv.lock` with the same
  pinned OSV-Scanner, and fails on a known vulnerability. Like the pnpm
  scan, it checks that the scanner read as many packages as the lock holds,
  so a lock it can't parse fails rather than passes.
- Dependabot has a `uv` entry for `/data/pipeline`, weekly, with a 14-day
  cooldown, matching the npm entry's style.
- The `.github/dependabot.yml` comment no longer says uv is left out.
- `make check COMPONENT=ci` passes, with zizmor clean apart from the
  recorded waiver.

## Edge cases

- A `uv.lock` with no packages still passes the count check.

## Tests

- No test file. Report actionlint and zizmor output, and the scan's output
  on the current `uv.lock` from the PR's own run.

## Out of scope

- The terraform ecosystem for `infra/` (a separate follow-up).
