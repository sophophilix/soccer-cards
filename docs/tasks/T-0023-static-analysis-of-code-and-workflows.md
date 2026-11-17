---
id: T-0023
title: Run static analysis on the code and on the workflows
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/workflows/analysis.yml
  - .github/codeql/**
dependencies: []
max_changed_lines: 140
status: ready
---

## Goal

A pull request that adds an unsafe pattern to the code, or an unsafe
workflow, gets an alert before it merges.

## Context

- The `ci-supply-chain` skill, "Workflow rules" and "The gates".
- `make check COMPONENT=ci` runs actionlint and zizmor on the workflows.
- CodeQL is free for a public repository. Its upload step needs
  `security-events: write`, in that job only.
- Runs after T-0021.
- Aim for about 90 changed lines. The limit is 140.

## Acceptance criteria

- `.github/workflows/analysis.yml` runs on `pull_request`, on `push` to
  `main` and weekly on a schedule.
- A `codeql` job analyses `javascript-typescript` and `actions`.
- A `workflows` job installs actionlint and zizmor, each pinned by version
  and checked against a SHA-256, and runs `make check COMPONENT=ci`.
- The `codeql` job raises `security-events: write` for itself, with a
  comment that says why. No other job raises a permission.
- The workflow follows every rule in "Workflow rules".
- `make check COMPONENT=ci` passes.

## Edge cases

- A pull request from a fork can't upload results. The job still analyses
  and fails on a finding.
- Generated files under `packages/schema/src/generated` and the build
  output are not analysed.

## Tests

- No test file. Report the output of `make check COMPONENT=ci` and the
  first run on the pull request.

## Out of scope

- Semgrep. The repository has no Semgrep rules yet. They need their own
  task.
- CodeQL for Python. There is no Python package outside the kit.
- Budgets for script size and page performance.
