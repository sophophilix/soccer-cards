# ADR 0001: Stack and repository layout

> Status: Approved
> Created: 2026-11-15T11:16:22Z
> Last reviewed: 2026-11-16T07:30:27Z
> Next review: Not scheduled

## Review guide

Decision requested: accept the languages, tools and folder layout below for
the first public version of Soccer Cards.

Check these points:

- [ ] Python for the data pipeline (D2) is worth a second toolchain, given
      the team's existing Python skills.
- [ ] Committing the generated API data (D5) is acceptable.
- [ ] Staying on TypeScript 6 until the lint tools support 7 (D3) is
      acceptable.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

One repository holds a static web app, a pure game-rules package, a data
contract, a data pipeline and the infrastructure code. The site is static
files. It has no server code and no runtime call to another host.

## Context

- The prototype in `prototype/` fixes the look and the game rules the
  children approved: packs, a collection, trades, favourites, a collector
  guide, coins and battles against the computer.
- The site is public and its players are children (ADR 0003).
- The tech lead wants production practice: small changes, tests, lint,
  security checks and a pipeline, with agents doing the work under rules a
  program enforces (ADR 0004).
- Tool facts are in
  `docs/reviews/sdlc-and-stack-practice-research-20261115T111622Z.md`.

## Decision

**D1. Layout.** One repository, as a pnpm workspace plus one uv project.

```text
apps/web/         SvelteKit 3 app: routes, components, styles, service worker
packages/game/    Game rules in plain TypeScript. No DOM, no framework, no I/O
packages/schema/  JSON Schema for the data contract and the generated types
data/pipeline/    Python: fetch, licence check, ratings, validate, write
data/api/v1/      The pipeline's output: the static API and the photos
infra/            OpenTofu for the Cloudflare account and zone
tools/sdlc/       The SDLC kit (ADR 0004)
docs/             Decisions, task briefs, reviews, guides
evals/            Checks on the agents, the skills and the product
prototype/        The approved prototype, kept as the design reference
```

A package imports only from packages to its left in this list:
`schema`, then `game`, then `web`. The lint configuration enforces it.

**D2. Languages.** TypeScript for `apps/web`, `packages/game` and
`packages/schema`. Python 3.11 or newer for `data/pipeline`, under the team's
existing Python skills. The JSON Schema in `packages/schema` is the only
contract between the two.

**D3. Toolchain.** The skills hold the detail. The choices:

| Purpose | Choice |
|---|---|
| Web framework | SvelteKit 3 with Svelte 5, prerendered by `adapter-static` |
| TypeScript | 6.x with `strict`, until typescript-eslint and `svelte-check` support 7 |
| Package manager | pnpm with its supply chain settings, and uv for Python |
| Lint and format | ESLint with typescript-eslint strict type-checked rules and `eslint-plugin-svelte`, Prettier, `svelte-check` |
| Unit and component tests | Vitest, with Browser Mode for components |
| Property tests | fast-check for the game rules |
| End-to-end and accessibility tests | Playwright with axe |
| Unused code | Knip |
| Git hooks | pre-commit with local hooks |

**D4. Game rules are pure.** `packages/game` takes its random numbers and
the clock as arguments. The same seed always gives the same pack. The web app
supplies the real ones.

**D5. Data is built ahead of time and committed.** The pipeline writes
`data/api/v1/`. A scheduled CI job runs it and opens a pull request, so a
person reviews every data change and a build never depends on a live source.
The web build copies that folder into the site.

**D6. Player state stays on the device.** The collection, coins and
favourites are stored in the browser with a version number and a migration
for each change of shape.

**D7. Static first.** The first version has no server code. Play between two
devices needs a server and is a later decision record.

**D8. The whole solution runs and is tested locally.** One command starts
the site on a laptop, and one command runs the automated end-to-end tests
with Playwright. The tests run against the built site on a local preview
served by `wrangler dev`, with no account, secret or network. CI runs the
same commands. The web gate includes the end-to-end tests, so an agent
can't finish a web task while a journey fails. The `ts-testing` skill holds
the commands and the journeys.

## Consequences

- The game rules can be tested in milliseconds without a browser.
- Two toolchains run in CI. The Python one reuses skills the team already
  trusts.
- A data refresh is a reviewable diff, and photos add binary files to git.
  At 36 players that is about 1 MB.
- No player data exists on a server, so there is none to breach.

## Rejected

- **A runtime call to a football data API.** It adds a third-party request
  from a children's site, a key to protect and a rate limit.
- **React with Next.js.** It works, and it ships a larger runtime for an
  animation-heavy phone app. The prototype needs no server rendering.
- **Biome or Oxlint in place of ESLint.** Neither is confirmed to lint Svelte
  templates with type information. Review when that changes.
- **A TypeScript data pipeline.** One language is simpler, and it would
  discard the team's Python standards and review skills.

## Risks and open items

- SvelteKit 3 is three months old. Expect fixes in minor releases.
- The ESLint setup for SvelteKit 3 is unproven until the scaffold task runs.
- Remote functions are experimental. The first version doesn't use them.
- Whether `wrangler dev` applies the `_headers` file to a local preview is
  unverified. If it doesn't, the header tests run only on the preview
  deployment.
- The end-to-end tests in the web gate make each web task slower to finish.
  Measure the run time in the scaffold task.

## Review history

| Reviewed at | Decision | Notes |
|---|---|---|
| 2026-11-15T11:16:22Z | Drafted | Initial version, written by Claude for the tech lead. |
| 2026-11-16T07:28:57Z | Amended | Added D8 on local running and end-to-end tests, at the tech lead's request. |
| 2026-11-16T07:30:27Z | Approved | The tech lead replied "approve all" in the lead session. |
| 2026-11-27T21:48:16Z | Amended | D8 amended by ADR 0012 D1: off CI, end-to-end tests run in one browser with two workers, and CI runs all three browsers. |
