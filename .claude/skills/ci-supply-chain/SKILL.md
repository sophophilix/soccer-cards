---
name: ci-supply-chain
description: "Guides GitHub Actions workflows, security scanning, dependency updates and releases for this repository. Use when a task touches .github/, a scanner's configuration, Dependabot, pnpm-workspace.yaml supply chain settings, or the release process. Requires ts-standards and python-standards."
metadata:
  version: "1.0.0"
---

# CI and supply chain

CI runs the same commands a developer and a hook run: `make check`. A
workflow adds scanners and deploys. It never holds logic of its own that
can't run on a laptop.

## Workflow rules

These follow GitHub's secure use reference and the team's `ai-code-audit`
workflow.

- `permissions: contents: read` at the top of every workflow. A job raises
  one permission, with a comment that says why.
- Pin every action to a full commit SHA with the version in a comment.
  Dependabot proposes updates after 14 days.
- Trigger on `pull_request` and on `push` to `main`. Never use
  `pull_request_target`. A workflow that needs a secret doesn't run code from
  a fork.
- Never put `${{ github.event.* }}` or another untrusted value inside a
  `run:` script. Pass it through `env:` and quote the variable.
- `actions/checkout` sets `persist-credentials: false`.
- Pin the runner image, such as `ubuntu-24.04`. Don't use `latest`.
- Every job has `timeout-minutes`. Every workflow has a `concurrency` group
  that cancels a superseded run. Deploys don't cancel.
- A tool downloaded in a step is pinned by version and checked against a
  SHA-256, as the gitleaks step in `ai-code-audit` does.
- Secrets live in a GitHub environment with the tech lead as required
  reviewer. One secret per value. Never echo one.
- A workflow never creates, approves or merges a pull request, except the
  scheduled data refresh, which opens one for review.

GitHub now offers a workflow dependency lockfile,
`.github/workflows/actions.lock`, that also pins the actions an action uses.
Adopting it is a decision for the tech lead once Dependabot's handling of it
is confirmed. Until then, pin by SHA.

## The gates

Every pull request runs all of these. Each is required by the ruleset on
`main`.

| Gate | Tool | Fails on |
|---|---|---|
| Kit | `make check COMPONENT=sdlc` and `docs` | Any failure |
| TypeScript | `make check` for `schema`, `game`, `web` | Format, lint, types, tests, coverage, unused code |
| Python | `make check COMPONENT=data` | The gates in `python-standards` |
| Infrastructure | `make check COMPONENT=infra` | Format, validate, `tofu test` (the `opentofu` skill) |
| End-to-end | Playwright on the preview | Any journey, accessibility, privacy or header test |
| Secrets | gitleaks over the full history | Any finding |
| Dependencies | OSV-Scanner on `pnpm-lock.yaml`, `pip-audit` per `python-standards`, GitHub dependency review | A known vulnerability in a runtime dependency |
| Static analysis | Semgrep with repository rules, CodeQL for JavaScript, Python and Actions | Any new alert |
| Workflows | zizmor | Any finding |
| Budgets | Script size and page performance | A budget the tech lead set |

- A gate that can't run is a failure, not a skip.
- A waiver names the advisory or rule, the scope, the reason, and an expiry
  date, in a file the tech lead owns. An expired waiver fails the gate.
- Check that a dependency scanner reads both documents of `pnpm-lock.yaml`.
  pnpm warns that one that doesn't reports nothing and still passes.

## Dependencies

- `pnpm-workspace.yaml` sets `minimumReleaseAge`, `strictDepBuilds`,
  `blockExoticSubdeps` and `trustPolicy`. See `ts-standards`. Only the tech
  lead changes them or adds to `allowBuilds`.
- Dependabot covers `npm`, `uv`, `github-actions` and `terraform`, weekly,
  with a 14-day cooldown and grouped minor and patch updates.
- An update pull request passes the same gates and gets the same review. A
  major version is its own task with a brief.
- Read the changelog of what you upgrade. Say in the pull request what
  changed for this project.

## Branches and commits

- `main` is protected by a ruleset: pull requests only, every gate green, one
  approval from the tech lead, no force push, linear history.
- Branch names: `<kind>/<task-id>-<slug>`, such as
  `feat/T-0007-jumbo-pack`.
- Commit messages follow Conventional Commits. The commit hook checks the
  subject. Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`,
  `ci`, `chore`, `revert`.
- The pull request is squash merged. Its title is the commit message.
- `CODEOWNERS` gives the tech lead `.github/`, `.claude/`, `tools/sdlc/`,
  `infra/`, `docs/decisions/` and the lockfiles.

## Releases

- Every merge to `main` is a release candidate and deploys after approval.
- The version is the date and the short commit, shown in the site's footer
  so a bug report can name it.
- `CHANGELOG.md` gets one plain line per change a player or a developer
  would notice.

## Scheduled jobs

- Data refresh: runs the pipeline and opens a pull request with the diff.
- Refactor scan: runs the scans in the `refactoring` skill and opens an issue
  with the report.
- Full scan: gitleaks, the dependency audits and CodeQL on `main` weekly,
  because new advisories arrive without a commit.
