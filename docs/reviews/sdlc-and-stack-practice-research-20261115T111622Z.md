# Research: engineering practice for the Soccer Cards stack and AI delivery

> Status: In review
> Created: 2026-11-15T11:16:22Z
> Last reviewed: 2026-11-15T11:16:22Z
> Next review: Not scheduled

## Review guide

Decision requested: accept this record as the evidence base for decision
records 0001 to 0004 and for the skills under `.claude/skills/`.

Check these points:

- [ ] The facts marked "secondary" are acceptable to build on until someone
      checks the primary source.
- [ ] The gaps under "Limits of this research" are acceptable for a first
      version.
- [ ] The existing skills listed under "Existing skills and plugins" are the
      right ones to adopt or leave out.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

The tools moved a long way in 2026. SvelteKit is at version 3, TypeScript 7
is a native compiler that the lint and Svelte tools can't use yet, pnpm delays
new package versions by default, and GitHub Actions has a lockfile for action
versions. The skills pin choices to what the primary sources say today.

Claude Code now gives a harness three ways to enforce a rule without a model:
hooks, permission rules and subagent tool lists. Its own guidance is to put
any rule that can't have exceptions in one of those, and to keep that set
small. Decision 0004 follows it.

Every source below was read on 2026-11-15. "Primary" means the maintainer's
own documentation or repository. "Secondary" means a search result summary or
a third-party article, which nobody has checked against the primary source.

## Findings by component

### Web framework: SvelteKit 3 and Svelte 5

| Finding | Source | Kind |
|---|---|---|
| `@sveltejs/kit` 3.2.0 is the latest release | [SvelteKit releases](https://github.com/sveltejs/kit/releases) | Primary |
| SvelteKit 3 needs Node 22.17, TypeScript 6, Svelte 5.57.1, Vite 8.0.12 and, for Cloudflare, Wrangler 4.67 or newer | [Migrating to SvelteKit v3](https://svelte.dev/docs/kit/migrating-to-sveltekit-3) | Primary |
| Configuration moved from `svelte.config.js` into the `sveltekit()` plugin in `vite.config.js` | Same page | Primary |
| The `$lib` alias became `#lib`, declared under `imports` in `package.json`, with file extensions in imports | Same page | Primary |
| `$app/stores` is removed in favour of `$app/state`. `$app/environment` is now `$app/env` | Same page | Primary |
| Server-only files use a `server` path segment. Remote functions use a `remote` segment and are still experimental | Same page | Primary |
| Service workers register as modules and need `src/service-worker/tsconfig.json` | Same page | Primary |
| Only `src/routes` and `src/app.html` are required. Unit tests sit beside the code as `.test` files, and browser tests go in `tests/` | [Project structure](https://svelte.dev/docs/kit/project-structure) | Primary |
| New projects are created with `npx sv create`, and upgraded with `npx sv migrate sveltekit-3` | Migration page | Primary |

### Language: TypeScript

| Finding | Source | Kind |
|---|---|---|
| TypeScript 7.0, the native compiler, was announced on 2026-06-18. TypeScript 6.0 was announced on 2026-03-06 | [TypeScript blog](https://devblogs.microsoft.com/typescript/) | Primary |
| TypeScript 6 turns `strict` on by default and no longer includes every `@types` package automatically | Search summary of release coverage | Secondary |
| typescript-eslint doesn't support TypeScript 7 because version 7 has no tool API yet. Its supported range ends below 6.1 | Search summary of typescript-eslint issue 12518 | Secondary |
| Svelte template checking can't run on TypeScript 7 until that API exists | Search summary | Secondary |

Conclusion: the `typescript` package stays on 6.x until typescript-eslint and
`svelte-check` support 7. That also meets SvelteKit 3's minimum.

### Lint and format

| Finding | Source | Kind |
|---|---|---|
| Biome lints only the script part of `.svelte` files, and its type-aware rules use its own type inference | Search summary, 2025 article | Secondary |
| Oxlint's type-aware linting is in alpha and its documentation doesn't mention Svelte | Search summary | Secondary |
| Playwright recommends the `no-floating-promises` rule and `tsc --noEmit` in CI | [Playwright best practices](https://playwright.dev/docs/best-practices) | Primary |

Conclusion: ESLint with typescript-eslint's strict type-checked rules and
`eslint-plugin-svelte`, Prettier with its Svelte plugin, and `svelte-check`.
The faster linters are a later review, when they cover Svelte templates.

### Package manager and supply chain

| Finding | Source | Kind |
|---|---|---|
| pnpm doesn't run dependency build scripts unless `allowBuilds` names the package. `strictDepBuilds` fails the install for an unlisted one | [pnpm supply chain security](https://pnpm.io/supply-chain-security) | Primary |
| `minimumReleaseAge` defaults to 1440 minutes. 10080 waits a week | Same page | Primary |
| `trustPolicy: no-downgrade` fails an install when a package's trust level drops | Same page | Primary |
| `blockExoticSubdeps` blocks transitive dependencies from git or tarball URLs | Same page | Primary |
| A scanner must read both documents of `pnpm-lock.yaml`, or it reports nothing without failing | Same page | Primary |
| OSV-Scanner reads pnpm lockfiles and exits with code 1 on a finding | Search summary | Secondary |

### Tests

| Finding | Source | Kind |
|---|---|---|
| The Vitest documentation is at version 5.1.0. Browser Mode needs a provider package, and `@vitest/browser-playwright` is the suggested one | [Vitest Browser Mode](https://vitest.dev/guide/browser/) | Primary |
| `vitest-browser-svelte` renders Svelte components in Browser Mode | Same page | Primary |
| Test what the user sees. Prefer role and text locators. Use web-first assertions. Keep tests isolated. Don't test third parties. Trace on first retry in CI | [Playwright best practices](https://playwright.dev/docs/best-practices) | Primary |

### Hosting and infrastructure

| Finding | Source | Kind |
|---|---|---|
| `adapter-cloudflare` builds for Workers static assets and for Pages. `adapter-static` output also works on Workers static assets | [adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare) | Primary |
| A matching static file is served without running Worker code. Each Worker version has its own asset manifest | [Workers static assets](https://developers.cloudflare.com/workers/static-assets/) | Primary |
| `_headers` and `_redirects` apply to static asset responses only | adapter-cloudflare page | Primary |
| Cloudflare recommends Workers with static assets for new projects and puts new features there | Search summary of Cloudflare's migration guide | Secondary |
| The Terraform provider can upload a Worker with static assets since v5.11.0. Its changelogs record drift fixes through v5.19.0 | Search summary of Cloudflare changelogs | Secondary |

### CI and GitHub Actions

| Finding | Source | Kind |
|---|---|---|
| Set the default `GITHUB_TOKEN` to read-only and raise it per job. Pass untrusted values through environment variables. Avoid `pull_request_target`. Put `.github/workflows` under CODEOWNERS | [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) | Primary |
| A workflow dependency lockfile, `.github/workflows/actions.lock`, records the commit of every action including transitive ones. GitHub says it supersedes SHA pinning where adopted. Reusable workflow calls still need a full SHA | [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles) | Primary |
| Dependabot alerts don't cover actions pinned to a SHA | Secure use reference | Primary |
| zizmor is a static analyser for GitHub Actions, Dependabot and pre-commit configuration | [zizmor documentation](https://docs.zizmor.sh/) | Primary |

### Delivery practice

| Finding | Source | Kind |
|---|---|---|
| "100 lines is usually a reasonable size for a CL, and 1000 lines is usually too large." Tests go with the change. Refactoring goes in its own change | [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) | Primary |
| A reviewer approves once a change definitely improves code health. Facts overrule preferences. The style guide is the authority on style | [The standard of code review](https://google.github.io/eng-practices/review/reviewer/standard.html) | Primary |

### AI coding harness: Claude Code

| Finding | Source | Kind |
|---|---|---|
| An instruction in a prompt, `CLAUDE.md` or a skill is not guaranteed. A hook, a deny rule or a managed setting is applied every time | [Best practices](https://code.claude.com/docs/en/best-practices) | Primary |
| "If something has to happen every time, make it a hook, a deny rule, or a managed setting." Keep the enforced set small | Same page | Primary |
| Keep `CLAUDE.md` short. Put team procedures in skills | Same page | Primary |
| A reviewer told to find problems always finds something. Tell it to report what affects correctness | Same page | Primary |
| `PreToolUse` exit code 2 blocks the tool call. `SubagentStop` exit code 2 keeps the subagent working. `onFailure: "block"` makes a broken hook refuse | [Hooks reference](https://code.claude.com/docs/en/hooks) | Primary |
| A `prompt` or `agent` hook asks a model, so it is not deterministic | Best practices page | Primary |
| A subagent file sets `tools`, `skills`, `model`, `isolation: worktree` and `maxTurns`. A tool list is enforced by the harness | [Subagents](https://code.claude.com/docs/en/sub-agents) | Primary |
| A subagent gets its own system prompt, so restate critical rules in the delegation | Same page | Primary |
| Keep `SKILL.md` under 500 lines and move detail to reference files. The description is cut at 1,536 characters | [Skills](https://code.claude.com/docs/en/skills) | Primary |
| Agent teams are experimental, cost more tokens, and suit work that needs discussion. Two agents editing the same file overwrite each other | [Agent teams](https://code.claude.com/docs/en/agent-teams) | Primary |

### Children's privacy

| Finding | Source | Kind |
|---|---|---|
| The Australian Information Commissioner must register the Children's Online Privacy Code by 2026-12-10. It applies to Privacy Act entities whose online services children are likely to use | Search summary of [the OAIC code page](https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code) and law firm commentary | Secondary |
| The UK Age Appropriate Design Code has 15 standards, including best interests of the child, data minimisation and high privacy by default | Search summary of the ICO's executive summary | Secondary |

Nobody has checked whether either code applies to this project in law. The
project adopts their direction as an engineering rule: collect nothing.

### Photos and Wikimedia

| Finding | Source | Kind |
|---|---|---|
| Every request needs a User-Agent with a client name, a version and contact details. A generic one may be blocked without notice | [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy) | Primary |
| The thumbnail host answered HTTP 429 after 8 downloads at 0.3 second spacing. A 4 second gap with a retry completed the other 28 | Prototype run on 2026-11-15, `prototype/tools/fetch_photos.py` | Primary |
| Reusers must give the attribution each file's licence requires and check each file's own licence tag | Search summary of [Commons: Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) | Secondary |
| The 36 prototype photos carry CC BY-SA 4.0, CC BY-SA 3.0 AT, CC BY 4.0, CC BY 3.0 or public domain tags | Commons API results stored in `prototype/photos/credits.json` | Primary |

### Refactoring support

| Finding | Source | Kind |
|---|---|---|
| Knip finds unused files, dependencies and exports, and has a Svelte plugin among more than 200 | [Knip](https://knip.dev/) | Primary |

## Existing skills and plugins

| Source | What it gives | Licence | Proposed use |
|---|---|---|---|
| `sophophilix/agent-skills` (this team) | `python-standards`, `python-style-guide`, `python-testing`, `python-architecture`, `python-review`, `technical-writing`, `humanizer` | MIT | Use as they are for the data pipeline and all documents |
| `sveltejs/ai-tools`, the [official Svelte plugin](https://svelte.dev/docs/ai/plugin) | A local MCP server with a documentation tool and `svelte-autofixer`, skills for Svelte 5, and an agent for Svelte files | MIT | Install as a plugin. `sveltekit-web` tells agents to run the autofixer |
| [`cloudflare/skills`](https://github.com/cloudflare/skills) | 22 skills including `workers-best-practices`, `wrangler`, `frameworks-on-cloudflare` and `web-perf`, plus an MCP server for the Cloudflare API and documentation | Apache-2.0 | Install as a plugin. `cloudflare-infra` points to them |
| Claude Code built-ins | `/code-review`, `/security-review`, and `skill-creator` for skill evaluation | Bundled | Use for a second opinion and for the skill evaluations in `evals/` |
| `trailofbits/skills` | About 28 security audit skills, per aggregator pages | Not checked | Not adopted. They target security audits, which is the job of the audit kit after the build |
| `obra/superpowers` | A general agent development method, per aggregator pages | Not checked | Not adopted. It overlaps `delivery-lead` and has no enforcement by program |

Nobody on this project has read the contents of the Svelte and Cloudflare
plugins. Decision 0004 makes that read a condition of installing them, because
a plugin's skills and hooks run with the user's permissions.

## Limits of this research

- The lint configuration for ESLint with SvelteKit 3 was not tested, because
  no project exists yet. The first scaffold task proves it.
- Semgrep, CodeQL and gitleaks were not researched again. The skills reuse the
  team's settings from `ai-code-audit` and `python-standards`.
- Web performance thresholds, WCAG 2.2 criteria and Lighthouse CI were not
  read from their sources today. The skills name the standards and leave the
  budgets for the tech lead to set.
- An OpenTofu state backend on Cloudflare R2 was not verified.
- Whether Dependabot updates a workflow dependency lockfile was not confirmed.
  The documentation page says only that the format suits it.
- Exact package versions other than those in the tables were not looked up.
  The scaffold task reads them from the registry on the day.

## Review history

| Reviewed at | Decision | Notes |
|---|---|---|
| 2026-11-15T11:16:22Z | Drafted | Initial version, written by Claude for the tech lead. |
