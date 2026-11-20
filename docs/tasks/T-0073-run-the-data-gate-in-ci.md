---
id: T-0073
title: Run the data gate in CI
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/checks.yml
dependencies:
  - astral-sh/setup-uv
max_changed_lines: 80
status: ready
---

## Goal

Every pull request that touches `data/` runs `make check COMPONENT=data`, as
a required-check candidate named `data`.

## Context

- ADR 0006 D5, the `ci-supply-chain` skill, T-0068's path filter in
  `checks.yml`.

## Acceptance criteria

- A `data` job installs uv with `astral-sh/setup-uv`, pinned by SHA, with a
  release at least two weeks old, and runs `make check COMPONENT=data` with
  no credentials.
- The path filter runs `data` for changes under `data/`, and on every
  non-pull-request event, like the other gates.
- `make check COMPONENT=ci` passes, with zizmor clean apart from the
  recorded waiver.

## Edge cases

- A pull request that touches nothing in `data/` reports `data` as passed in
  seconds.

## Tests

- No test file. Report actionlint and zizmor output.

## Out of scope

- The ruleset (the tech lead adds `data` to the required checks).
