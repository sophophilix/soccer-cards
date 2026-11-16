# ADR 0002: Hosting and infrastructure as code

> Status: Approved
> Created: 2026-11-15T11:16:22Z
> Last reviewed: 2026-11-16T07:30:27Z
> Next review: Not scheduled

## Review guide

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

- **State storage.** Where OpenTofu state lives is not decided. An R2 bucket
  with the S3 backend is the likely choice and is unverified.
- **CI authentication.** Whether Cloudflare accepts GitHub's OpenID Connect
  tokens in place of a stored API token was not researched.
- **Provider stability.** Pin the Cloudflare provider to an exact version and
  read its changelog before each upgrade.

## Review history

| Reviewed at | Decision | Notes |
|---|---|---|
| 2026-11-15T11:16:22Z | Drafted | Initial version, written by Claude for the tech lead. |
| 2026-11-16T07:30:27Z | Approved | The tech lead replied "approve all" in the lead session. |
