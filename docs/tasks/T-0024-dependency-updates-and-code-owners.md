---
id: T-0024
title: Propose dependency updates weekly and name the owner of guarded paths
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/dependabot.yml
  - .github/CODEOWNERS
dependencies: []
max_changed_lines: 80
status: ready
---

## Goal

Updates to packages and to pinned actions arrive as pull requests each
week, and GitHub shows who owns the paths only the tech lead changes.

## Context

- The `ci-supply-chain` skill, "Dependencies" and "Branches and commits".
- `pnpm-workspace.yaml` sets `minimumReleaseAge`. The Dependabot cooldown
  must not be shorter.
- Read GitHub's current Dependabot options reference before writing a key.
- Aim for about 50 changed lines. The limit is 80.

## Acceptance criteria

- `.github/dependabot.yml` covers the `npm` and `github-actions`
  ecosystems, weekly, with a 14-day cooldown.
- Minor and patch updates are grouped into one pull request per ecosystem.
  A major update gets its own pull request.
- Update pull requests use a Conventional Commits prefix that the commit
  hook accepts.
- `.github/CODEOWNERS` gives `@sophophilix` `.github/`, `.claude/`,
  `tools/sdlc/`, `bin/sdlc`, `docs/decisions/`, `pnpm-lock.yaml` and
  `pnpm-workspace.yaml`.
- `make check COMPONENT=ci` passes.

## Edge cases

- The `uv` and `terraform` ecosystems are left out until `data/` and
  `infra/` exist, with a comment that says so.
- A path in `CODEOWNERS` that doesn't exist yet, such as `infra/`, is left
  out, with a comment.

## Tests

- No test file. Report that GitHub parses both files with no error on the
  pull request.

## Out of scope

- Merging an update. Each one passes the gates and gets a review.
- Requiring a code owner's review in the ruleset. One account can't approve
  its own pull request.
