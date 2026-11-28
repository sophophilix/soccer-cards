---
id: T-0137
title: Scan and update the player API's Python dependencies
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/workflows/scans.yml
  - .github/dependabot.yml
dependencies: []
max_changed_lines: 80
status: done
---

## Goal

`apps/api/uv.lock` (T-0135) gets the same supply-chain checks as
`data/pipeline/uv.lock`: the OSV scan in CI and weekly Dependabot updates.
Today neither covers it (T-0135 security review F1).

## Context

- T-0074 added both for `data/pipeline`. Copy its pattern.
- `scans.yml` step "Scan data/pipeline/uv.lock" checks that OSV-Scanner reads
  every `[[package]]` in the lock, so a lock it can't parse fails.
- `dependabot.yml` has a `uv` entry for `/data/pipeline` with a 14-day
  cooldown, grouped minor and patch updates and the `build` prefix.

## Acceptance criteria

- A scan step for `apps/api/uv.lock` with the same package-count check. It
  runs even when an earlier scan step fails, and passes while the file is
  absent.
- A Dependabot `uv` entry for `/apps/api` with the same schedule, cooldown,
  groups and commit prefix as `/data/pipeline`.
- `make check COMPONENT=ci` passes, including zizmor and actionlint.

## Edge cases

- `apps/api/uv.lock` missing (a branch before T-0135): the step passes.
- OSV-Scanner reads fewer packages than the lock holds: the step fails.

## Tests

- The step run on the branch's own lock in CI, and the count check shown to
  fail with a lock it reads short (say how in the report).

## Out of scope

- The pipeline's scan and entry, other workflows, and the required checks.
