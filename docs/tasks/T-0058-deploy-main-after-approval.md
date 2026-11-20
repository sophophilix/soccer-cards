---
id: T-0058
title: Deploy the commit on main whose checks passed, after the tech lead approves
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/deploy.yml
  - .github/workflows/checks.yml
dependencies: []
max_changed_lines: 140
status: ready
---

## Goal

A merge to `main` reaches the live site only after every gate passed on that
exact commit and the tech lead approved the deployment (ADR 0002 D3).

## Context

- ADR 0002 D3, D6, D7 and D9. The `ci-supply-chain` and `cloudflare-infra`
  skills.
- `.github/workflows/checks.yml`: the workflow rules to follow. It becomes
  a reusable workflow that `deploy.yml` calls, so the deploy depends on the
  checks of the same run instead of polling for another run. zizmor
  refuses `workflow_run`, and polling an API is a workaround.
- `.github/workflows/preview.yml` from T-0057, for the build steps to reuse
  in the same form.
- The `production` environment holds `CLOUDFLARE_API_TOKEN`, the variable
  `CLOUDFLARE_ACCOUNT_ID`, and the tech lead as required reviewer.

## Acceptance criteria

- `checks.yml` runs on `pull_request` and `workflow_call`, no longer on
  `push`. Its job names stay the same, because they are required checks.
- `deploy.yml` is the pipeline for `main`: on `push` to `main` it calls
  `checks.yml` as a job, and the deploy job `needs` it. It checks out
  `github.sha`, not the branch head. T-0060 adds the infrastructure apply to
  this same pipeline, after the deploy.
- The deploy job uses the `production` environment, so it waits for the tech
  lead's approval, and sets the environment `url` to
  `https://soccercards.dsantmaj.com`.
- It builds once and runs `wrangler deploy` on that build. The version
  message names the commit SHA.
- Two merges close together never deploy an older commit after a newer one:
  one workflow-level concurrency group for `main` that never cancels a run in
  progress, so a newer run replaces only a pending one.
- The workflow has no `workflow_dispatch` input that picks an arbitrary ref.
- `make check COMPONENT=ci` passes, with zizmor clean. If zizmor flags the
  trigger, fix the cause or explain it in the report. Don't silence it.

## Edge cases

- `checks` fails on `main`: nothing deploys and the run says why.
- The approval is never given: the run waits and expires without deploying.
- A failed check is re-run inside the same pipeline run, and the deploy then
  continues after approval.

## Tests

- No test file. Report actionlint and zizmor output, and describe how the
  first real deploy will be checked by the tech lead.

## Out of scope

- The custom domain (T-0059) and rollback automation (ADR 0002 D7 keeps
  rollback with the tech lead).
