---
name: cloudflare-infra
description: "Guides hosting and infrastructure work: Cloudflare Workers static assets, Wrangler configuration, OpenTofu under infra/, response headers and deploys. Use when a task touches infra/, wrangler.jsonc, _headers, a deploy workflow, DNS or a domain. Requires ci-supply-chain."
metadata:
  version: "1.0.0"
---

# Cloudflare hosting and infrastructure

ADR 0002 holds the decisions. This skill is how to work within them.

**An agent plans. It never applies.** The kit refuses `wrangler deploy`,
`wrangler secret`, `tofu apply`, `tofu destroy` and `tofu state` in every
agent session. Deploys run in CI from `main`. If your task seems to need one
of these, stop and tell the lead.

## Use current Cloudflare documentation

When the official Cloudflare plugin is installed, load its
`workers-best-practices`, `wrangler` and `frameworks-on-cloudflare` skills,
and use its documentation tool before writing configuration. Without it,
read the page on `developers.cloudflare.com`. Don't write a configuration key
from memory.

## One owner per resource

| Resource | Owner | File |
|---|---|---|
| The site's files, versions and deployments | Wrangler | `apps/web/wrangler.jsonc` |
| Zone settings, DNS, the custom domain, account rules | OpenTofu | `infra/` |
| Repository rules and environments | The tech lead | `.github/rulesets/` |

Never manage one resource from two tools.

## Wrangler

- The site is static assets only. `assets.directory` points at the
  `adapter-static` build output. There is no `main` script in the first
  version.
- Set `compatibility_date` to the day the task is done.
- Set `assets.not_found_handling` to serve the site's own 404 page.
- No secrets in `wrangler.jsonc`. A static site needs none.
- Check a change with `wrangler deploy --dry-run`. The kit allows that.

## Response headers

`apps/web/static/_headers` applies to static asset responses.

- `Content-Security-Policy`: `default-src 'self'` as the base. No other host
  appears anywhere in the policy. No `unsafe-eval`. Avoid `unsafe-inline` for
  scripts. Use the hashes SvelteKit generates.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, microphone, geolocation and the other device
  features set to none.
- `frame-ancestors 'none'` in the policy, so no other site can frame the
  game.
- Files with a hash in the name get a one-year immutable cache. HTML, the
  service worker and the API index are revalidated on each request.

A Playwright test asserts each header on the preview. Change the test with
the header.

## OpenTofu

- Pin the OpenTofu version and the Cloudflare provider to exact versions.
  Read the provider's changelog before an upgrade. Its v5 releases record
  drift fixes.
- State lives in a remote backend, never in git. `.gitignore` excludes it.
- No value that is a secret appears in a `.tf` file or a committed
  `.tfvars` file. Variables that hold one are marked `sensitive`.
- One module per concern, with typed variables that have descriptions and
  validation.
- Name resources by what they are for, in snake_case.
- Run `tofu fmt -check`, `tofu validate` and `tofu plan` in the task. Put the
  plan summary in your report. A plan that destroys or replaces a resource
  needs the tech lead's attention, so say so first in the report.
- CI runs the plan on a pull request and applies on `main` only after the
  tech lead approves the environment.

## Deploy and preview

- A pull request uploads a Worker version without deploying it and gets a
  preview address. End-to-end tests run there.
- A merge to `main` builds once and deploys that build after approval.
- Rolling back is deploying the previous version. The tech lead does it.
- Assets and HTML can come from two versions for a short time during a
  deploy. Keep old hashed files reachable and never rename a public path in
  the same release that removes it.

## The gate

`make check COMPONENT=infra` runs format, validate, a security scan of the
configuration, and the Wrangler dry run.
