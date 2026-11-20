# ADR 0002: Hosting and infrastructure as code

> Status: Approved, with the amendment of 2026-11-20 (D8 to D10).
> Created: 2026-11-15T11:16:22Z
> Last reviewed: 2026-11-20T09:43:42Z
> Next review: Not scheduled

## Review guide for the amendment of 2026-11-20

Decision requested: settle the open items on state storage, the address and
CI credentials (D8 to D10). The tech lead chose the address and Azure in the
lead session on 2026-11-20.

Check these points:

- [ ] The site answers at `soccercards.dsantmaj.com` only. OpenTofu manages
      that one name and changes no setting that applies to the whole
      `dsantmaj.com` zone (D8).
- [ ] OpenTofu state lives in Azure Blob Storage, encrypted by OpenTofu
      before upload, and GitHub signs in to Azure with OpenID Connect (D9).
- [ ] Cloudflare logs, traces and Web Analytics stay off (D10).

Respond with `approve`, `approve with follow-up: <action>` or
`request changes: <specific issue>`.

## Review guide (original)

Decision requested: host the site on Cloudflare Workers static assets, and
split ownership of the infrastructure between OpenTofu and Wrangler as below.

Check these points:

- [ ] Cloudflare is the host you want. You already have, or will create, the
      account and the domain.
- [ ] Deploys only from `main` in CI, never from a laptop or an agent (D3).
- [ ] The open items on state storage and CI credentials are acceptable to
      settle in the first infrastructure task.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

The site is a folder of static files served by Cloudflare. One tool owns each
resource. An agent can plan a change and can never apply one.

## Context

- The site is static (ADR 0001 D7).
- `adapter-static` output runs on Workers static assets, and a matching file
  is served without running Worker code.
- Secondary sources say Cloudflare recommends Workers static assets over
  Pages for new projects. See the research record.

## Decision

**D1. Host.** Cloudflare Workers with static assets, with no Worker script in
the first version.

**D2. One owner per resource.**

| Resource | Owner | Where |
|---|---|---|
| The Worker's files, versions and deployments | Wrangler | `apps/web/wrangler.jsonc` |
| Zone settings, DNS records, the custom domain and account-level rules | OpenTofu with the Cloudflare provider | `infra/` |
| Repository settings: rulesets, environments, required checks | A JSON ruleset in `.github/rulesets/`, applied by the tech lead | `.github/` |

A resource never appears in two tools.

**D3. Deploys run in CI from `main`.** A merge to `main` builds once, runs
every gate, and deploys that build. The deploy job uses a GitHub environment
with the tech lead as required reviewer. The SDLC kit refuses
`wrangler deploy` and `tofu apply` from any agent session.

**D4. A preview for each pull request.** CI uploads the build as a Worker
version without deploying it and posts the preview address on the pull
request. The end-to-end tests run against that preview.

**D5. Response headers are code.** A `_headers` file sets a Content Security
Policy with no third-party hosts, `X-Content-Type-Options`, a referrer
policy, a permissions policy that turns device features off, and long cache
lifetimes for hashed files only. A test asserts the headers on the preview.

**D6. Credentials.** Cloudflare tokens are scoped to this account and to the
permissions the job needs. They live in the GitHub environment, never in the
repository. Nothing on a laptop holds a deploy token.

**D7. Rollback.** Rolling back is deploying the previous Worker version. The
how-to guide records the command, and the tech lead runs it.

**D8. Address.** The site answers at `soccercards.dsantmaj.com`, a Workers
Custom Domain on the Worker `soccer-cards`. Cloudflare creates its DNS record
and certificate, so nobody adds a CNAME by hand. OpenTofu owns the custom
domain. It manages no zone-wide setting, because `dsantmaj.com` may serve
other sites. Wrangler declares no route or custom domain.

**D9. State.** OpenTofu state lives in a private Azure Blob Storage
container, with blob versioning and soft delete on, and shared-key access
off. The `azurerm` backend locks the state with a blob lease. OpenTofu
encrypts the state before upload, with a passphrase held only as a GitHub
environment secret. GitHub Actions signs in to Azure with OpenID Connect, so
no Azure secret is stored. The tech lead creates the storage and the
identities once, from `docs/how-to/set-up-hosting.md`.

| GitHub environment | Required reviewer | Azure identity and role | Used for |
|---|---|---|---|
| `preview` | None | `soccercards-github-plan`, Storage Blob Data Reader | Uploading a Worker version for a pull request, and `tofu plan -lock=false` |
| `production` | The tech lead | `soccercards-github-infra`, Storage Blob Data Contributor | `wrangler deploy` and `tofu apply` from `main` |

Any branch can use `preview`, so its identity can read the state but never
write or lock it. Only `production` can change the state.

Each environment has its own Cloudflare tokens. The `preview` tokens can
upload a version and read the zone. Only the `production` tokens can deploy
or change DNS.

**D10. No logs or analytics.** The Worker's observability (logs and traces)
is off in `wrangler.jsonc`, and Cloudflare Web Analytics is not enabled. Logs
would hold visitors' IP addresses (ADR 0003 D5), and from 2026-12-01 Workers
Logs are billed by volume. The free traffic graphs in the dashboard remain.

## Consequences

- Hosting costs nothing at this size, and static requests are not billed as
  Worker requests.
- A wrong deploy needs a failed gate, a missed review and an approval in the
  environment. Three checks stand in the way.
- Online play later needs a Worker script and Durable Objects. That moves the
  app to `adapter-cloudflare` in a new decision record.

## Rejected

- **Cloudflare Pages.** It still works, and new features go to Workers.
- **Deploying the Worker with OpenTofu.** The provider can upload assets
  since v5.11.0, and its changelogs record drift problems. Wrangler is the
  tool SvelteKit documents.
- **Deploying from a developer machine.** It bypasses every gate.

## Risks and open items

- **State storage.** Settled by D9 on 2026-11-20. An R2 bucket was not
  chosen: its locking through the S3 backend is unverified, and the bucket
  would have to exist before the state that describes it.
- **CI authentication.** Azure uses OpenID Connect (D9). Cloudflare tokens
  are still stored secrets, scoped per environment. Revisit if Cloudflare
  accepts GitHub's OpenID Connect tokens.
- **A lost state passphrase** makes the state unreadable. The state holds
  one custom domain, so the recovery is `tofu import` from a new state.
- **Pull requests from forks** get no secrets, so they get no preview. The
  repository takes changes from its own branches only.
- **Provider stability.** Pin the Cloudflare provider to an exact version and
  read its changelog before each upgrade.

## Review history

| Reviewed at | Decision | Notes |
|---|---|---|
| 2026-11-15T11:16:22Z | Drafted | Initial version, written by Claude for the tech lead. |
| 2026-11-16T07:30:27Z | Approved | The tech lead replied "approve all" in the lead session. |
| 2026-11-20T00:05:00Z | Amended (draft) | D8 to D10 added by Claude after the tech lead said "yes go with soccercards.dsantmaj.com and azure". Awaits approval. |
| 2026-11-20T09:43:42Z | Approved | The tech lead replied "yes do the read-only identity, and approve" in the lead session. D8 to D10 approved. D9 now gives `preview` a separate read-only Azure identity, as that reply decided. |
