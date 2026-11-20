---
id: T-0059
title: Attach soccercards.dsantmaj.com to the Worker with OpenTofu
component: infra
kind: feature
agent: infra-implementer
paths:
  - infra/**
  - .gitignore
dependencies:
  - opentofu
  - cloudflare/cloudflare
max_changed_lines: 260
status: ready
---

## Goal

`infra/` holds the OpenTofu configuration that attaches
`soccercards.dsantmaj.com` to the Worker `soccer-cards`, with its state in
Azure and encrypted before upload. After this task a plan can run in CI;
T-0060 runs it.

## Context

- ADR 0002 D2, D8, D9 and D10. The `cloudflare-infra` skill, section
  "OpenTofu".
- `docs/how-to/set-up-hosting.md` for the names of the backend settings,
  secrets and variables CI will pass.
- Read before writing a key: the OpenTofu pages on the `azurerm` backend
  (`use_oidc`, `use_azuread_auth`), state encryption with the `pbkdf2` key
  provider, and `tofu test` with `mock_provider`; the Cloudflare provider's
  page on `cloudflare_workers_custom_domain`.
- Use the newest OpenTofu and Cloudflare provider releases that are at
  least two weeks old today. Pin both exactly.
- `make check COMPONENT=infra` runs `fmt`, `init -backend=false`,
  `validate`, `test` and `tflint`. It needs `tofu` and `tflint` on the PATH.

## Acceptance criteria

- `infra/` pins the OpenTofu version and the Cloudflare provider exactly,
  and commits `.terraform.lock.hcl` with hashes for `linux_amd64`,
  `darwin_arm64` and `darwin_amd64`, written by `tofu providers lock`.
- The backend is `azurerm` with OpenID Connect and Azure AD auth, and the
  key `soccer-cards.tfstate`. The resource group, storage account and
  container come from `-backend-config` arguments at init, not from a file.
- State and plan encryption use the `pbkdf2` key provider. The passphrase
  comes from the `TF_STATE_PASSPHRASE` secret and appears in no file.
  An unencrypted state is refused, with no fallback method.
- One resource, `cloudflare_workers_custom_domain`, attaches
  `soccercards.dsantmaj.com` to the Worker `soccer-cards` in zone
  `dsantmaj.com`. No zone-wide setting and no other DNS record is managed.
- Variables have types, descriptions and validation: the account ID is 32
  hexadecimal characters, the hostname ends in the zone name.
- `.gitignore` excludes `.terraform/`, state files, plan files and
  `*.tfvars`, except `.terraform.lock.hcl`.
- `make check COMPONENT=infra` passes.

## Edge cases

- The provider token needs no variable: the provider reads
  `CLOUDFLARE_API_TOKEN` from the environment. No token variable exists.
- A hostname outside the zone, or an account ID with capitals or the wrong
  length, fails validation with a message that names the value's rule.

## Tests

- `infra/tests/*.tftest.hcl` with a mock Cloudflare provider: the custom
  domain has the expected hostname, service and zone; each validation
  refuses a bad value.

## Out of scope

- Any workflow (T-0060), `wrangler.jsonc` (T-0056) and creating the Azure
  storage (the tech lead, `docs/how-to/set-up-hosting.md`).
- Running `tofu plan` against real credentials. The agent has none.
