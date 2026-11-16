---
name: ts-standards
description: "Defines the TypeScript toolchain, dependency policy, quality gates and security floor for this repository. Use for any TypeScript, Svelte or package.json task, or when another skill needs a central rule. Use technical-writing for any documentation produced during the task."
metadata:
  version: "1.0.0"
---

# TypeScript standards

This skill is the source of truth for TypeScript tooling and cross-package
rules. `ts-style-guide`, `ts-testing`, `sveltekit-web` and `pr-review` point
here instead of repeating it. Exact configuration is in
[references/configs.md](references/configs.md).

## Rule precedence

1. The tech lead's explicit requirements
2. Accepted decision records in `docs/decisions/` and repository configuration
3. This skill and the other TypeScript skills
4. Tool defaults

Never weaken the security floor silently. Record a required exception, its
scope, its risk and its removal condition in a decision record.

## Runtime and layout

- Node: the version in `.node-version`. It must meet SvelteKit 3's minimum of
  22.17.
- ECMAScript modules only. Every `package.json` sets `"type": "module"`.
- One pnpm workspace: `apps/*` and `packages/*`. The root `package.json`
  names the exact pnpm version in `packageManager`.
- A package imports only from packages below it: `schema`, then `game`, then
  `web`. `packages/game` imports no DOM, Svelte or Node API.
- TypeScript 6.x. Don't move to 7 until typescript-eslint and `svelte-check`
  support it (ADR 0001 D3).

## Supported toolchain

| Purpose | Tool | Required use |
|---|---|---|
| Package management | pnpm | Everything. `npm`, `npx`, `yarn` and `bun` are refused by the kit |
| Format | Prettier with `prettier-plugin-svelte` | Every file it supports |
| Lint | ESLint flat config, typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`, `eslint-plugin-svelte` | All TypeScript and Svelte |
| Type check | `tsc --noEmit` for packages, `svelte-check` for the app | All code |
| Unit and component tests | Vitest | All behaviour changes |
| Property tests | fast-check | `packages/game` |
| End-to-end and accessibility | Playwright with `@axe-core/playwright` | The journeys in `ts-testing` |
| Unused code | Knip | CI and the refactor scan |
| Dependency audit | OSV-Scanner on `pnpm-lock.yaml` | CI |
| Static analysis | Semgrep with repository rules, CodeQL | CI |

A tool that is experimental, or that a model drives, is advisory. It is not a
gate until a decision record names its version, command, failure policy and
owner.

## Dependency policy

- Prefer the platform. Don't add a package for what the language, the
  browser or SvelteKit already does.
- A new package must be named in the task brief. `sdlc verify` fails the task
  otherwise.
- Before proposing one, check its licence, its last release, its open
  security advisories, its install scripts and its size in the client bundle.
  Put what you found in the task report.
- `pnpm-lock.yaml` owns exact versions. Never edit it by hand. CI and hooks
  install with `pnpm install --frozen-lockfile`.
- Runtime code goes in `dependencies`. Everything else goes in
  `devDependencies`. Tools live at the workspace root.
- `pnpm-workspace.yaml` holds the supply chain settings in
  `references/configs.md`. Only the tech lead changes them.
- Upgrade on purpose: one package, or one reviewed group, per pull request.

## Canonical quality commands

Each package defines the same script names. The `Makefile` calls them, and
the hooks and CI call the `Makefile`.

| Script | Does |
|---|---|
| `format:check` | Prettier in check mode |
| `lint` | ESLint with zero warnings allowed |
| `typecheck` | `tsc --noEmit`, or `svelte-check` in the app |
| `test` | Vitest, once, with coverage and thresholds |
| `test:e2e` | Playwright, in the app only |
| `unused` | Knip |

```bash
pnpm install --frozen-lockfile
make check COMPONENT=game
make check COMPONENT=web
```

Record each gate as `pass`, `fail`, `unavailable`, `not_run` or
`not_applicable`. A missing tool or script is `unavailable`, not a pass.

## Compiler and lint decisions

- `strict` is on. Also on: `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `noImplicitReturns`, `verbatimModuleSyntax`
  and `isolatedModules`.
- Lint errors, not warnings, for: floating promises, `any`, unsafe member
  access, non-null assertions, a `switch` that isn't exhaustive, unused
  variables, and imports that cross a package boundary.
- A file over 400 lines or a function with cyclomatic complexity over 15 is
  an error. Over 250 lines or complexity 10 is reported to the refactor scan.
- Every `eslint-disable` and `@ts-expect-error` names one rule and gives a
  reason on the same line. `@ts-ignore` is never used.
- Prefer a per-file override over a global one.

## Coverage

| Package | Lines and branches |
|---|---|
| `packages/game` | 95% |
| `packages/schema` | 90% |
| `apps/web/src/lib` | 80% |

Each package meets its own threshold. A total across packages proves nothing.

## Security floor

Everything sent to the browser is public. Never:

- put a secret, token or key in client code, a public environment variable
  or the repository
- use `eval`, `new Function` or a string passed to a timer
- render text as HTML: no `{@html}` with anything but a constant, no
  `innerHTML`
- trust data from outside the type system. Validate the API files and saved
  player state against a schema before use, and treat a failure as "no data"
- call `fetch`, load a script, font or image, or open a socket to another
  origin
- read or write `document.cookie`
- touch `localStorage` or `indexedDB` outside the one storage module
- use `postMessage` with a `*` target, or `target="_blank"` without
  `rel="noopener"`
- write a regular expression with nested quantifiers on input a user controls
- disable a lint or type rule to get a change through
- add a dependency that needs an install script without the tech lead adding
  it to `allowBuilds`

Game randomness comes from the injected generator in `packages/game`, never
from `Math.random` in a rule.
