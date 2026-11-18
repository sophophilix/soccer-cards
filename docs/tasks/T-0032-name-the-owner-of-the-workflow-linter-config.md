---
id: T-0032
title: Name the owner of the workflow linter's configuration files
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/CODEOWNERS
  - .github/workflows/analysis.yml
dependencies: []
max_changed_lines: 20
status: ready
---

## Goal

A pull request can't quietly add a file that tells the workflow linter to
ignore a finding. Today a `zizmor.yml` at the repository root would be
loaded by the gate and has no owner.

## Context

- Review of T-0029, security finding F2. Review of T-0023, finding F3.
- `Makefile`, the `check-ci` target: it runs `zizmor --offline .github`
  with no `--config` option.
- Aim for about 8 changed lines. The limit is 20.

## Acceptance criteria

- `@sophophilix` owns `/zizmor.yml` and `/zizmor.yaml`, listed with the
  other waiver files. `.github/` already covers the copies zizmor looks for
  there.
- The comment on the count step in `analysis.yml` says what the step does:
  it fails the job when CodeQL reports any result. It no longer claims to
  work when results can't be uploaded.
- `make check COMPONENT=ci` passes.

## Edge cases

- Neither zizmor file exists. The owner lines are added anyway.
- actionlint also reads `.github/actionlint.yaml`. `.github/` already
  covers it; say so in the report, and add no line.

## Tests

- No test file. Report that GitHub's `codeowners/errors` API returns no
  error for the branch.

## Out of scope

- Any change to what `analysis.yml` runs.
- The `Makefile`.
