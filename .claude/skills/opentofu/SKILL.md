---
name: opentofu
description: "States the OpenTofu (Terraform-compatible) practices for infra/: layout, versions and the lock file, variables and tfvars, secrets, state and its encryption, resources and lifecycle, refactoring with moved and import blocks, tests, and plan and apply in CI. Use when a task creates, changes or reviews anything under infra/, or a workflow that runs tofu. Requires cloudflare-infra."
metadata:
  version: "1.0.0"
---

# OpenTofu practices

`cloudflare-infra` says what OpenTofu owns here (ADR 0002). This skill says
how to write it. The rules follow the OpenTofu documentation and the widely
used Terraform style guidance. Where a rule differs from a habit you know,
the rule wins. Read the current OpenTofu and provider documentation for
every key you write. Don't write configuration from memory.

**An agent plans. It never applies.** The kit refuses `tofu apply`,
`tofu destroy`, `tofu import` and `tofu state` in agent sessions. Only CI
applies, from `main`, after the tech lead approves the `production`
environment.

## Layout

One root module in `infra/`. Files are named by what they hold:

| File | Holds |
|---|---|
| `versions.tf` | The `terraform` block: `required_version`, `required_providers`, `backend`, `encryption` |
| `providers.tf` | Provider blocks, with no credentials in them |
| `variables.tf` | Every input variable |
| `locals.tf` | Locals, when there are any |
| `main.tf` | Resources. Split into files by concern (`domain.tf`, `dns.tf`) when it passes about 150 lines |
| `outputs.tf` | Every output, when there are any |
| `production.tfvars` | The production values. Committed. No secret |
| `tests/*.tftest.hcl` | `tofu test` files |
| `.terraform.lock.hcl` | Provider hashes. Committed |

- Extract a child module only when two places use the same resources. A
  module that wraps one resource is noise.
- One state per environment. Today there is one, `production`. A second
  environment gets its own `<env>.tfvars` and its own backend key, never a
  workspace and never a copy of the root module.

## Versions and the lock file

- Pin `required_version` and every provider to an exact version in the
  root module. No `~>` and no `>=`.
- Use the newest release that is at least two weeks old (ts-standards).
  Read the changelog between the old and new version before an upgrade, and
  say what changed in the report.
- Write `.terraform.lock.hcl` only with `tofu providers lock`, for
  `linux_amd64`, `darwin_arm64` and `darwin_amd64`. Never edit it by hand.
- `tofu init -lockfile=readonly` in the gate and in CI, so a run can't
  change the lock file.

## Variables and tfvars

- Every variable has a `type`, a `description` and a `validation` block
  whose `error_message` names the rule. Use `nullable = false` when null
  makes no sense.
- **No default for a value that belongs to an environment**, such as an
  account ID, a zone or a hostname. Those go in `<env>.tfvars`, so a reader
  sees every real value in one file and a missing one fails at plan time.
  A default is for a value that is the same everywhere.
- `<env>.tfvars` is committed and holds no secret. `.gitignore` ignores
  every other `*.tfvars` and `*.auto.tfvars`.
- CI passes the file explicitly: `-var-file=production.tfvars`. Don't rely
  on `*.auto.tfvars` loading.
- Prefer object or map types with validation over many loose variables
  once a concern has more than about four inputs.

## Secrets

- A secret is never in a `.tf` file, a `.tfvars` file, a test file (use an
  invented value), a plan artifact or a log.
- Secrets reach OpenTofu as environment variables from the GitHub
  environment: `TF_VAR_<name>` for variables, and the provider's own
  variable for its token (`CLOUDFLARE_API_TOKEN`). No provider block has a
  token argument.
- A variable that holds a secret is `sensitive = true`. Mark it
  `ephemeral = true` too where OpenTofu allows it. The encryption block
  isn't one of those places.
- Plans and state can hold secret values. Never upload a plan file as an
  artifact, and never print `tofu show -json` output. The job summary gets
  the human-readable resource changes only.

## State

- Remote state only (ADR 0002 D9): Azure Blob with versioning, soft delete,
  shared key access off, OpenID Connect sign-in and lease locking. Backend
  settings that differ by environment come from `-backend-config` at init.
- OpenTofu encrypts state and plans before upload (`encryption` block,
  `pbkdf2` key provider, `aes_gcm`), with `enforced = true` and no
  unencrypted fallback. The passphrase comes from `TF_VAR_` and must be
  available at `tofu init`.
- Nobody edits state. A change to an address is a `moved` block. Bringing an
  existing resource under management is an `import` block, reviewed in a
  pull request and applied by CI. `tofu state rm` and `tofu import` from a
  laptop are not used.

## Resources

- Name each resource by its purpose in snake_case, singular, without
  repeating the type: `cloudflare_workers_custom_domain.site`, not
  `.custom_domain_resource`.
- Reference attributes instead of writing `depends_on`. Use `depends_on`
  only for a dependency OpenTofu can't see, with a comment that says why.
- `for_each` over a map with stable keys, not `count`, for anything that
  can have more than one. `count` is only for on or off.
- A resource whose loss takes the site down (the custom domain, a DNS
  record players use) gets `lifecycle { prevent_destroy = true }`. Removing
  that line is a change the tech lead reviews.
- Data sources only for what can't be a variable. Each one needs read
  access in both tokens.
- No provisioners, no `local-exec`, no `null_resource` or `terraform_data`
  that runs commands. No `-target` in normal work.
- A comment says why, not what. Point to the ADR for decisions.

## Tests and the gate

`make check COMPONENT=infra` runs `tofu fmt -check -recursive`,
`tofu init -backend=false -lockfile=readonly`, `tofu validate` and
`tofu test`.

- `tofu test` uses `mock_provider` blocks, so it needs no credentials and
  reaches no network. Each test file says so at the top.
- One `run` with `command = plan` asserts the important attributes of every
  resource.
- Every validation rule has a `run` with `expect_failures` that a broken
  rule would let pass. Cover each condition in a rule, not only the first.
- Tests read their values from `variables` blocks with invented values, or
  from the committed `production.tfvars` to prove the real values pass
  validation.
- No configuration scanner runs: the free scanners have no Cloudflare
  checks, so a scan would pass while checking nothing. The tests and the
  review are the policy checks. Add a scanner only when it has rules for a
  provider this repository uses.

## Plan and apply in CI

- `tofu init -input=false -lockfile=readonly`, then
  `tofu plan -input=false -lock-timeout=5m -var-file=production.tfvars
  -out=tfplan`, then `tofu apply -input=false tfplan`. Apply only the saved
  plan that was reviewed, never a fresh one.
- Before apply, read the plan as JSON inside the job and stop if any
  resource is deleted or replaced. Say so in the job summary.
- One run touches the state at a time (a `concurrency` group that never
  cancels a run in progress).
- A pull request plans with read access only where the backend allows it,
  and never applies.
- Drift (a change made in the dashboard) shows up as a plan diff. Fix it in
  code, never by hand.

## Review checklist

A reviewer of an `infra/` change checks, at least:

1. Exact pins, and a lock file written by `tofu providers lock`.
2. No environment value as a default. Every real value is in
   `production.tfvars`.
3. No secret in any file, and every secret variable `sensitive`.
4. `prevent_destroy` on every resource players depend on.
5. A `moved` or `import` block for any address change.
6. A test for every validation condition and every resource.
7. The plan summary in the implementer's report, with any destroy or
   replace first.
