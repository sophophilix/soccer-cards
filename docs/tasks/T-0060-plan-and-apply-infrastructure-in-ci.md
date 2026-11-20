---
id: T-0060
title: Plan infrastructure on pull requests and apply it from main after approval
component: ci
kind: feature
agent: infra-implementer
paths:
  - .github/workflows/infra.yml
  - .github/workflows/checks.yml
  - .github/workflows/deploy.yml
  - .github/CODEOWNERS
dependencies:
  - opentofu/setup-opentofu
  - azure/login
max_changed_lines: 280
status: ready
---

## Goal

A change to `infra/` shows its plan on the pull request, and reaches
Cloudflare only from `main` after the tech lead approves (ADR 0002 D3). The
infra gate also runs on every pull request.

## Context

- ADR 0002 D3, D6, D8 and D9. The `opentofu` skill, section "Plan and
  apply in CI", is the standard. The `ci-supply-chain` and
  `cloudflare-infra` skills.
- `infra/` from T-0059, and `make check COMPONENT=infra` in the `Makefile`.
- `docs/how-to/set-up-hosting.md`: the environments, secrets and variables.
- `.github/workflows/checks.yml`: the workflow rules to follow.

## Acceptance criteria

- `checks.yml` gains a job `infra` that installs a pinned `tofu`
  and runs `make check COMPONENT=infra`, with no credentials. The other jobs
  are unchanged.
- A new workflow runs `tofu plan` on a pull request that changes `infra/`,
  in the `preview` environment, signed in to Azure by OpenID Connect with
  `id-token: write` on that job only. The `preview` identity can only read
  the state, so the plan runs with `-lock=false`. It uses
  `CLOUDFLARE_INFRA_TOKEN` and `TF_STATE_PASSPHRASE`, and writes the
  human-readable resource changes to the job summary. No plan file or
  `tofu show -json` output is uploaded or printed.
- Every run passes `-var-file=production.tfvars`. The passphrase reaches
  OpenTofu as `TF_VAR_state_passphrase` from `tofu init` on. Init uses
  `-input=false -lockfile=readonly`, and the backend location comes from
  `-backend-config` with the `TF_STATE_*` variables.
- On `main`, the pipeline in `deploy.yml` (T-0058) gains an apply job that
  `needs` the deploy job, so the Worker exists before the custom domain is
  attached. A `plan` job in the `infra-plan` environment (ADR 0002 D9: `main`
  only, no reviewer, read-only identity and token) runs on every `main`
  push with `-lock=false -detailed-exitcode`, writes the human-readable
  changes to the summary, and outputs whether there are changes. When there
  are, an `apply` job in `production` waits for the tech lead, who has seen
  that plan, then plans again with `-out=tfplan` and applies exactly that
  saved plan. When there are none, no job waits and the summary says so.
  `infra.yml` handles pull requests only.
- The passphrase and Cloudflare token are set only on the steps that run
  `tofu`, never for a whole job, as the deploy job does with its token
  (T-0060 security review F1 and F2).
- `.github/CODEOWNERS` owns `/infra/` (the tech lead), replacing the comment
  that says to add it later.
- A plan that destroys or replaces a resource stops before apply and says
  so in the summary.
- Only one run touches the state at a time (a concurrency group), and runs
  are never cancelled mid-apply.
- `make check COMPONENT=ci` passes, with zizmor clean.

## Edge cases

- A pull request from a fork or Dependabot gets no secrets: the plan job is
  skipped and says why.
- The first `main` run after this task merges finds the custom domain
  missing and plans to create it, so the first apply happens then, even
  though that push doesn't change `infra/`.
- If the plan the apply job makes differs from the one in `infra-plan`
  (something changed in between), the apply job stops before applying and
  says so, rather than applying a plan nobody saw. Compare the resource
  changes, not the plan file.

## Tests

- No test file. Report actionlint and zizmor output.

## Out of scope

- `infra/` itself (T-0059) and the ruleset's required checks (the tech
  lead adds `infra` there).
