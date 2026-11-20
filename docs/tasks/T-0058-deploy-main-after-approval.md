---
id: T-0058
title: Deploy the commit on main whose checks passed, after the tech lead approves
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/deploy.yml
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

A merge to `main` reaches the live site only after every gate passed on that
exact commit and the tech lead approved the deployment (ADR 0002 D3).

## Context

- ADR 0002 D3, D6, D7 and D9. The `ci-supply-chain` and `cloudflare-infra`
  skills.
- `.github/workflows/checks.yml`: the workflow rules to follow, and the
  `checks` workflow whose success the deploy waits for.
- `.github/workflows/preview.yml` from T-0057, for the build steps to reuse
  in the same form.
- The `production` environment holds `CLOUDFLARE_API_TOKEN`, the variable
  `CLOUDFLARE_ACCOUNT_ID`, and the tech lead as required reviewer.

## Acceptance criteria

- The workflow deploys only a commit on `main` whose `checks` workflow
  succeeded, and it checks out that exact commit, not the branch head.
- The deploy job uses the `production` environment, so it waits for the tech
  lead's approval, and sets the environment `url` to
  `https://soccercards.dsantmaj.com`.
- It builds once and runs `wrangler deploy` on that build. The version
  message names the commit SHA.
- Two merges close together never deploy an older commit after a newer one.
- The workflow has no `workflow_dispatch` input that picks an arbitrary ref.
- `make check COMPONENT=ci` passes, with zizmor clean. If zizmor flags the
  trigger, fix the cause or explain it in the report. Don't silence it.

## Edge cases

- `checks` fails on `main`: nothing deploys and the run says why.
- The approval is never given: the run waits and expires without deploying.
- `checks` is re-run and succeeds later: that re-run may deploy.

## Tests

- No test file. Report actionlint and zizmor output, and describe how the
  first real deploy will be checked by the tech lead.

## Out of scope

- The custom domain (T-0059) and rollback automation (ADR 0002 D7 keeps
  rollback with the tech lead).
