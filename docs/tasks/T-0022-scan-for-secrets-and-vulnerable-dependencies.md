---
id: T-0022
title: Scan every pull request for secrets and vulnerable dependencies
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/workflows/scans.yml
  - osv-scanner.toml
dependencies: []
max_changed_lines: 160
status: done
---

## Goal

A leaked secret or a dependency with a known vulnerability stops a pull
request, and a weekly run catches an advisory published after the merge.

## Context

- The `ci-supply-chain` skill, "Workflow rules", "The gates" and
  "Scheduled jobs".
- `docs/security/accepted-advisories.md`: the tech lead's accepted
  advisories and their recheck dates.
- The pre-commit hook already runs gitleaks on staged changes.
- Runs after T-0021.
- Aim for about 100 changed lines. The limit is 160.

## Acceptance criteria

- `.github/workflows/scans.yml` runs on `pull_request`, on `push` to `main`
  and weekly on a schedule.
- A `secrets` job runs gitleaks over the full history and fails on any
  finding. The gitleaks download is pinned by version and checked against a
  SHA-256.
- A `dependencies` job runs OSV-Scanner on `pnpm-lock.yaml` and fails on a
  known vulnerability. Its download or action is pinned the same way.
- The job proves that the scanner reads the lockfile: it fails when the
  scanner reports no packages scanned.
- `osv-scanner.toml` ignores exactly the advisories open in
  `docs/security/accepted-advisories.md`, each with the reason and an
  `ignoreUntil` date no later than its recheck date. An advisory with no
  fixed date gets 30 days.
- A `dependency-review` job runs GitHub's dependency review on pull
  requests.
- The workflow follows every rule in "Workflow rules".
- `make check COMPONENT=ci` passes.

## Edge cases

- An ignore entry past its `ignoreUntil` date no longer hides the finding.
- The scheduled run has no pull request. The dependency review job is
  skipped there by its trigger, not by `continue-on-error`.
- A pull request from a fork runs every scan with no secret.

## Tests

- No test file. Report the gitleaks and OSV-Scanner output from a local
  run, with the count of packages scanned, and the first run on the pull
  request.

## Out of scope

- A new accepted advisory. Only the tech lead accepts one.
- `pip-audit`. There is no Python package yet.
- CodeQL, Semgrep and zizmor (T-0023).
