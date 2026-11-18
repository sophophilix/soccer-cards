---
id: T-0021
title: Run the kit and TypeScript gates on every pull request
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/workflows/checks.yml
dependencies: []
max_changed_lines: 150
status: done
---

## Goal

Every pull request and every push to `main` runs the same gates a developer
runs, on GitHub's machines. Today a gate result exists only on the laptop
that ran it.

## Context

- The `ci-supply-chain` skill, "Workflow rules" and "The gates".
- ADR 0004 D4: CI runs `make check`. A workflow holds no logic of its own.
- `Makefile`: the gates for `sdlc`, `docs`, `schema`, `game` and `web`.
  The `web` gate includes the Playwright tests and starts its own preview.
- `.node-version` and the `packageManager` field in `package.json` name the
  Node and pnpm versions.
- Read the current documentation for each action before pinning it.
- Aim for about 90 changed lines. The limit is 150.

## Acceptance criteria

- `.github/workflows/checks.yml` runs on `pull_request` and on `push` to
  `main`.
- It has one job per gate, named `sdlc`, `docs`, `schema`, `game` and
  `web`, and each job's only test command is
  `make check COMPONENT=<name>`.
- Node comes from `.node-version` and pnpm from `packageManager`.
  Dependencies install with a frozen lockfile.
- The `web` job installs the Playwright browsers the tests use, at the
  version in the lockfile.
- The workflow follows every rule in "Workflow rules": top-level
  `permissions: contents: read`, each action pinned to a full commit SHA
  with its version in a comment, `persist-credentials: false`, a pinned
  runner image, `timeout-minutes` on every job and a `concurrency` group
  that cancels a superseded run.
- `make check COMPONENT=ci` passes.

## Edge cases

- A pull request from a fork runs the gates with no secret and no write
  permission.
- No value from `github.event` appears inside a `run:` script.
- A gate that can't run fails its job. No step uses `continue-on-error`.

## Tests

- No test file. Report the output of `make check COMPONENT=ci`, and the
  first run of each job on the pull request.

## Out of scope

- Scanners (T-0022 and T-0023), Dependabot and `CODEOWNERS` (T-0024).
- The `data` and `infra` gates. Those components don't exist yet.
- Deploys, and the ruleset on `main`. The tech lead adds the five job names
  as required checks after this merges.
