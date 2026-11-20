---
id: T-0060
title: Plan infrastructure on pull requests and apply it from main after approval
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/infra.yml
  - .github/workflows/checks.yml
dependencies:
  - opentofu/setup-opentofu
  - azure/login
  - terraform-linters/setup-tflint
max_changed_lines: 200
status: ready
---

## Goal

A change to `infra/` shows its plan on the pull request, and reaches
Cloudflare only from `main` after the tech lead approves (ADR 0002 D3). The
infra gate also runs on every pull request.

## Context

- ADR 0002 D3, D6, D8 and D9. The `ci-supply-chain` and `cloudflare-infra`
  skills.
- `infra/` from T-0059, and `make check COMPONENT=infra` in the `Makefile`.
- `docs/how-to/set-up-hosting.md`: the environments, secrets and variables.
- `.github/workflows/checks.yml`: the workflow rules to follow.

## Acceptance criteria

- `checks.yml` gains a job `infra` that installs pinned `tofu` and `tflint`
  and runs `make check COMPONENT=infra`, with no credentials. The other jobs
  are unchanged.
- A new workflow runs `tofu plan` on a pull request that changes `infra/`,
  in the `preview` environment, signed in to Azure by OpenID Connect with
  `id-token: write` on that job only. It uses `CLOUDFLARE_INFRA_TOKEN` and
  `TF_STATE_PASSPHRASE`, and writes the plan summary to the job summary.
- On `main`, when `infra/` changed and `checks` succeeded on that commit, it
  plans and applies that plan in the `production` environment, which waits
  for the tech lead.
- A plan that destroys or replaces a resource stops before apply and says
  so in the summary.
- Only one run touches the state at a time (a concurrency group), and runs
  are never cancelled mid-apply.
- `make check COMPONENT=ci` passes, with zizmor clean.

## Edge cases

- A pull request from a fork or Dependabot gets no secrets: the plan job is
  skipped and says why.
- The custom domain needs the Worker to exist. The summary on the first
  `main` run says to deploy first if the apply fails for that reason.

## Tests

- No test file. Report actionlint and zizmor output.

## Out of scope

- `infra/` itself (T-0059) and the ruleset's required checks (the tech
  lead adds `infra` there).
