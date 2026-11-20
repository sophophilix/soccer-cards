---
id: T-0067
title: Deploy main only after the scans and the analysis pass too
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/deploy.yml
  - .github/workflows/scans.yml
  - .github/workflows/analysis.yml
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

The `main` pipeline deploys a commit only after every gate passed on it:
the checks, the scans (gitleaks, OSV-Scanner) and the analysis (CodeQL,
actionlint, zizmor). Today it waits for the checks only (T-0058 review F3,
ADR 0002 D3).

## Context

- ADR 0002 D3. The `ci-supply-chain` skill.
- `.github/workflows/deploy.yml` calls `checks.yml` as a reusable workflow
  (T-0058). Use the same pattern for `scans.yml` and `analysis.yml`.
- CodeQL results for the default branch must still be uploaded on `main`,
  and the weekly `schedule` runs must stay.

## Acceptance criteria

- `scans.yml` and `analysis.yml` run on `pull_request`, `schedule` and
  `workflow_call`, not on `push`. Their job names stay the same, because
  they are required checks.
- `deploy.yml` calls both, and the deploy job `needs` the checks, the scans
  and the analysis.
- Each called workflow gets only the permissions it needs from the caller,
  written on the calling job. CodeQL's `security-events: write` is granted
  only to the analysis call.
- `make check COMPONENT=ci` passes, with zizmor clean apart from the
  recorded `self-repository` waiver (expires 2027-02-20). Any new
  `./.github/workflows/` call carries the same waiver and reason.

## Edge cases

- A failing scan or analysis job stops the deploy, and the run shows which.
- The weekly schedule still runs every scan and analysis job.

## Tests

- No test file. Report actionlint and zizmor output.

## Out of scope

- `checks.yml` and the deploy job's own steps.
