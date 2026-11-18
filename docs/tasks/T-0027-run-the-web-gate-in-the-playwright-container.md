---
id: T-0027
title: Run the web gate in the Playwright container pinned by digest
component: ci
kind: chore
agent: infra-implementer
paths:
  - .github/workflows/checks.yml
dependencies: []
max_changed_lines: 60
status: done
---

## Goal

The `web` job stops downloading browsers on every run. Today that download
has no checksum, and on 2026-11-18 it took 18 minutes once and hit the
20-minute timeout once. The tech lead chose the container on 2026-11-18.

## Context

- The `ci-supply-chain` skill, "Workflow rules": a download is checked
  against a SHA-256, and an image is pinned by digest.
- T-0021 review: the Playwright browser download has no SHA-256 check.
- `apps/web/package.json` and `pnpm-lock.yaml`: the Playwright version in
  use. The image tag must match it exactly.
- Microsoft publishes the image as `mcr.microsoft.com/playwright`. Read
  Playwright's current Docker and CI pages before writing a key.
- Aim for about 25 changed lines. The limit is 60.

## Acceptance criteria

- The `web` job runs in the Playwright image whose version equals the
  lockfile's Playwright version, pinned as `tag@sha256:digest` with the
  version in a comment.
- The job has no `playwright install` step and no other browser download.
- The job fails with a clear message when the image's Playwright version
  and the lockfile's differ.
- The other four jobs and every workflow rule the file already follows are
  unchanged: pinned actions, `persist-credentials: false`, timeouts,
  permissions.
- The `web` timeout drops to 10 minutes.
- `make check COMPONENT=ci` passes.

## Edge cases

- The image runs as root by default. If Playwright, pnpm or git refuses to
  run that way, fix it the way Playwright's CI page says and say so in a
  comment.
- `.node-version` may differ from the image's Node. The job still uses the
  repository's Node version.
- WebKit and Chromium are both in the image. Don't add Firefox.

## Tests

- No test file. Report the `web` job's duration on the pull request's first
  run, and that all Playwright projects ran.

## Out of scope

- Dependabot keeping the digest current. Say in the report whether its
  `github-actions` ecosystem updates a job `container:` image.
- Any change to the Playwright configuration or the tests.
