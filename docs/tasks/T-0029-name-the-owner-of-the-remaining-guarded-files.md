---
id: T-0029
title: Name the owner of the remaining guarded files
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/CODEOWNERS
dependencies: []
max_changed_lines: 30
status: ready
---

## Goal

`CODEOWNERS` lists every file that only the tech lead changes. Today it
leaves out four kit files that AGENTS.md rule 2 names, and the files that
waive a scanner finding.

## Context

- Review of T-0024, security finding F1. Review of T-0022, security
  finding F4.
- AGENTS.md rule 2.
- Aim for about 12 changed lines. The limit is 30.

## Acceptance criteria

- `@sophophilix` owns `/AGENTS.md`, `/CLAUDE.md`, `/Makefile` and
  `/.pre-commit-config.yaml`.
- `@sophophilix` owns the waiver files: `/osv-scanner.toml`,
  `/.gitleaks.toml`, `/.gitleaksignore` and
  `/docs/security/accepted-advisories.md`.
- The header comment still describes the list truthfully.
- `make check COMPONENT=ci` passes.

## Edge cases

- `.gitleaks.toml` and `.gitleaksignore` don't exist yet. They are listed
  anyway, with a comment: gitleaks loads them from a pull request's own
  tree, so the owner line must exist before the file does.
- `osv-scanner.toml` arrives with T-0022. If it isn't on `main` yet, the
  line is still added.

## Tests

- No test file. Report that GitHub's `codeowners/errors` API returns no
  error for the branch.

## Out of scope

- Requiring a code owner's review in the ruleset.
- Any workflow file.
