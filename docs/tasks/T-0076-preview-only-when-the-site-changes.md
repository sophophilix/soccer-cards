---
id: T-0076
title: Run the Cloudflare preview only when a pull request changes the site
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/preview.yml
max_changed_lines: 80
dependencies: []
status: ready
---

## Goal

A pull request that doesn't change what the site serves doesn't ask the
tech lead to approve a preview. Today every pull request does.

## Context

- `preview.yml` (T-0057), the path filter in `checks.yml` (T-0068), ADR
  0002 D9 (each preview waits for the tech lead).

## Acceptance criteria

- `preview.yml` runs its upload and end-to-end jobs only when the pull
  request changes `apps/web/`, `packages/`, `pnpm-lock.yaml`, the root
  `package.json` or `preview.yml` itself. Use the workflow's
  `on.pull_request.paths` filter, so no job and no approval request appears
  otherwise.
- Nothing else in the workflow changes, and the preview jobs stay out of
  the required checks.
- `make check COMPONENT=ci` passes, with zizmor clean apart from the
  recorded waiver.

## Edge cases

- A docs-only pull request shows no preview run at all.

## Tests

- No test file. Report actionlint and zizmor output, and whether this PR's
  own run (which changes `preview.yml`) asks for a preview.

## Out of scope

- `checks.yml`, `deploy.yml`.
