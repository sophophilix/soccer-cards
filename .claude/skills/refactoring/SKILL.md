---
name: refactoring
description: "Guides behaviour-preserving refactoring: the scans that find candidates, how the lead turns them into refactor tasks, and how the refactorer carries one out without changing behaviour, tests or contracts. Use for the scheduled refactor scan, for any task with kind refactor, and when asked to clean up, simplify, deduplicate or restructure code."
metadata:
  version: "1.0.0"
---

# Refactoring

A refactoring changes the structure of code and leaves its behaviour exactly
as it was. If a player or a caller could notice the difference, it isn't a
refactoring. It is a feature or a fix, and it needs that kind of task.

Refactoring is periodic work with its own tasks (ADR 0004 D8). It never rides
along in a feature task.

## What a program enforces

- A `kind: refactor` brief must name the `refactorer`.
- The refactorer writes only the brief's paths.
- `sdlc verify` fails a refactor that changes a test file, adds a
  dependency, leaves its paths or passes 400 changed lines.
- The component's gate must pass when the refactorer finishes.

## The scan

A program finds the candidates. A model doesn't go looking for things to
improve, because it always finds some.

Run on a schedule, weekly once code exists, and after each milestone:

| Signal | Tool | Reports |
|---|---|---|
| Unused files, exports and dependencies | Knip | Each item |
| Duplicated code | A copy-paste detector | Blocks repeated across files |
| Complexity and size | ESLint at the report thresholds in `ts-standards` | Functions over 10, files over 250 lines |
| Boundary breaks | The import rules in ESLint | Imports that cross a package or reach around an owner module |
| Suppressions | A search for `eslint-disable` and `@ts-expect-error` | Each one with its reason and age |
| Stale notes | A search for `TODO` | Any without a task id, or whose task is done |
| Python | Ruff, and the unused-code and duplication checks in `python-standards` | Each item |
| Churn | `git log` | Files changed most often in the last 30 days |

The scan writes `docs/reviews/refactor-scan-<UTC timestamp>.md` under the
`technical-writing` skill: each signal, its count, the change since the last
scan, and the items.

## The test review

Every two weeks, with the scan (ADR 0011 D4). It writes
`docs/reviews/test-review-<UTC timestamp>.md` in the same format. Run each
step one at a time, inside `bin/sdlc slot --`, so it stays within the
machine budget (ADR 0012).

| Signal | How | Reports |
|---|---|---|
| Flaky tests | Each package's tests 5 times, each with a new fast-check seed (`fc.configureGlobal`), and the end-to-end suite with `--repeat-each=3` | Each test that failed at least once, with its seed |
| Two layers | Search component and end-to-end tests for the same behaviour, such as double taps, reduced motion, saving refused, another tab | Each pair, with the layer that should own it |
| Slow tests | Vitest and Playwright JSON reporters | Tests over 1 s |
| Density | Test lines per source line, by module | Modules over 3 |
| Stale tests | A search of test names and comments for removed features and closed task ids | Each one |

Each finding becomes a `kind: chore` brief for the `web-implementer` or
`data-implementer`, at most three per review. A cut lists every test it
removes and names the test that still covers that behaviour.

## From scan to tasks

The lead reads the report and writes briefs for what is worth doing.

- Prefer code that is both poor and often changed. Leave poor code that
  nobody touches.
- One kind of refactoring and one area per task. "Remove unused exports in
  `packages/game`" is a task. "Tidy the game package" is not.
- Give the reason from the scan in the brief, with the numbers.
- If the code lacks tests that pin its behaviour, write a `kind: chore` task
  for the tests first. Refactor only after it merges.
- Three refactor tasks from one scan is plenty. The rest wait for the next.

## Carrying one out

1. Run `make check COMPONENT=<name>` before you change anything. If it
   fails, stop and report. Never refactor on a failing gate.
2. Make one small change. Run the tests. Repeat.
3. Don't change a test. If a test must change for the code to compile, the
   change isn't behaviour-preserving, or the test was testing internals.
   Stop and report which.
4. Run the gate again when you finish.

### In scope

- Rename for clarity, inside the task's paths.
- Extract, inline or move a function, component or module.
- Remove code the scan proved unused. First say what it appears to have been
  for. Code can exist for a reason nobody wrote down.
- Replace duplication with one shared piece, once it has three real uses.
- Simplify a condition, flatten nesting, split a long function.
- Narrow a type, or replace a cast with a check.
- Remove a suppression by fixing its cause.

### Out of scope, always

- The JSON Schema, the API files, saved-state shape, routes and a package's
  exported names. These are contracts.
- Test files, except a move or rename the brief allows with
  `tests_may_change: true`.
- Behaviour, including error messages, timing a player can see and the
  order of results.
- Dependencies and tool configuration.
- Formatting only. Prettier owns it.
- A new abstraction for a future need.
- Performance work. It changes behaviour a user can measure and needs a
  `perf` task with a measurement.

## The report

End with:

- what you changed, by refactoring type
- the gate result before and after, with the commands
- the scan numbers for your paths before and after
- anything you found and left alone, as candidates for the next scan
- anything that looked like a bug. Don't fix it. Report it for a `fix` task.
