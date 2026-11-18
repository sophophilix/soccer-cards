---
id: T-0030
title: Upgrade ESLint and typescript-eslint past the minimatch advisory
component: web
kind: chore
agent: web-implementer
paths:
  - package.json
  - pnpm-lock.yaml
  - osv-scanner.toml
  - docs/security/accepted-advisories.md
dependencies:
  - eslint
  - typescript-eslint
max_changed_lines: 400
status: ready
---

## Goal

No `minimatch` release with GHSA-g3hv-75wg-m249 is left in the lockfile, so
the accepted advisory can be closed and its scanner ignore removed.

## Context

- `docs/security/accepted-advisories.md`: the minimatch row. The tech lead
  extended it to 2026-12-18 on 2026-11-18 and asked for this upgrade.
- On 2026-11-18, `eslint` 10.15.0 depends on `minimatch` ^11.0.5 and
  `typescript-eslint` 8.73.0 on ^11.0.1. The lockfile has `eslint` 10.14.0,
  `typescript-eslint` 8.72.1 and `minimatch` 10.2.6.
- `pnpm-workspace.yaml`: `minimumReleaseAge` is seven days. A release
  younger than that can't be installed. Don't change the setting.
- Runs after T-0022, which adds `osv-scanner.toml`.
- The lockfile is written by `pnpm`, never by hand. Most of the changed
  lines are the lockfile, which is why the limit is 400.

## Acceptance criteria

- `pnpm why minimatch` shows no release below 11.0.1.
- `package.json` asks for the `eslint` and `typescript-eslint` releases
  that achieve this, and nothing else in it changes.
- The minimatch entry is removed from `osv-scanner.toml`, and OSV-Scanner
  on `pnpm-lock.yaml` reports no finding.
- The minimatch row moves to "Closed" in the accepted-advisories page,
  with the date and the releases that fixed it.
- `make check-all` passes with no change to `eslint.config.js` and no new
  lint suppression.

## Edge cases

- A needed release is younger than seven days. Stop and report the date it
  becomes installable. Don't lower `minimumReleaseAge` or add an exclusion.
- Another package still pulls in an old `minimatch`. Report which one.
  Don't add a `pnpm` override without the lead's word.
- The upgrade turns on a lint rule that fails existing code. Stop and tell
  the lead. Fixing code is a different task.
- The lockfile change exceeds 400 lines. Stop and tell the lead.

## Tests

- No test file changes. Report the output of `pnpm why minimatch`, the
  OSV-Scanner run and `make check-all`.

## Out of scope

- Any other upgrade. Dependabot proposes those.
- The picomatch advisory.
