# Accepted advisories and exceptions

> Status: Draft
> Created: 2026-11-16T20:49:05Z
> Last reviewed: 2026-11-18T03:10:00Z
> Next review: 2026-11-20

Only the tech lead accepts a security risk (AGENTS.md rule 1). This page
lists each acceptance in the tech lead's own words, so a scanner finding
can be matched to a decision. The lead adds a row when the tech lead
decides, and checks every open row when it writes a plan.

Each row records a decision already made. The page itself has not been
reviewed.

## Open

| Item                                                                               | Package                                                                      | Scope                                                                                                            | Accepted   | Tech lead's words                                                                        | Recheck                                                                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), moderate | `minimatch` 10.2.6, through ESLint and typescript-eslint                     | Development tool. The globs come from this repository.                                                           | 2026-11-16 | "accept the minimatch advisory until 20 Nov"                                             | 2026-11-20. Upgrade ESLint when a release uses `minimatch` 11.0.1 or later.  |
| [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), high     | `picomatch` 4.0.7, through `fdir`, `knip`, `tinyglobby`, `vite` and `vitest` | Development and build tools. The patterns come from this repository, and the package is not sent to the browser. | 2026-11-18 | "yes to all your recommendations", in reply to the lead's "accept picomatch for 30 days" | 2026-12-18. Upgrade when a fixed release exists. None existed on 2026-11-18. |
| Release age under seven days                                                       | `pnpm` 12.21.0, published 2026-11-13                                         | The package manager pin                                                                                          | 2026-11-16 | "keep pnpm 12.21.0"                                                                      | Closes by itself on 2026-11-20, when the release is seven days old.          |

## Closed

| Item                                                                     | Package                                                   | Closed     | Why                                                                                                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | `deepmerge` 4.3.1, through `@sveltejs/vite-plugin-svelte` | 2026-11-18 | GitHub withdrew the advisory on 2026-11-16T18:55:38Z, and OSV-Scanner no longer reports it. The tech lead had said "accept deepmerge" on 2026-11-16. |

## How to recheck

1. Run the scanner on `pnpm-lock.yaml`.
2. For each open row, look for a fixed release of the package.
3. If one exists, write a task that upgrades it, and move the row to
   "Closed" in the pull request that lands the upgrade.
4. If a row's date has passed with no fix, ask the tech lead to extend it
   or to choose another fix.
