# ADR 0011: Test strategy

> Status: Approved
> Created: 2026-11-27T21:48:16Z
> Last reviewed: 2026-11-27T21:48:16Z
> Next review: after the first test review

## Review guide

Decision requested: write tests first from the brief, test each behaviour once at the lowest layer that can check it, keep every test deterministic, and review the suite every two weeks.

The tech lead approved this on 2026-11-23 ("approve, do phase 1 first then the test tasks"). The evidence is in `docs/reviews/test-suite-audit-20261123T210553Z.md`.

## Context

The repository has about 1,000 test cases. The audit found that the end-to-end layer repeats checks that cheaper layers own, and runs them in three browsers. 30 property tests draw new random inputs on every run. One test compares wall-clock time with 50 ms. Nothing decided which layer owns a behaviour, so tasks added tests at every layer.

## Decisions

### D1. Test-first, from the brief

1. A brief's `## Tests` section is a test plan: one line per acceptance criterion, naming the layer and the test.
2. The implementer writes those tests first and commits them. They fail.
3. The implementer writes the code until they pass, then refactors.
4. The reviewer checks that each criterion has one test at the planned layer.

The plan is the limit as well as the minimum. A test outside the plan needs a reason in the implementer's report.

### D2. One behaviour, one test, at the lowest layer

| Layer                          | Owns                                                                      |
| ------------------------------ | ------------------------------------------------------------------------- |
| Game rules, Node               | every rule, number and edge case. Property tests for invariants.          |
| Unit, Node                     | pure web logic: loaders, words, config, headers                           |
| Component, Vitest browser mode | what one component shows and does, its guards, its accessibility scan     |
| End-to-end, one browser        | journeys across pages, saved progress across reloads, privacy and headers |
| End-to-end, three browsers     | layout, touch, fonts and tap targets, tagged `@engines`                   |

An end-to-end test never checks a number a rule computes. It checks that the number appears.

This amends ADR 0009, which said each screen adds end-to-end tests and an accessibility scan. A screen still gets an accessibility scan and its journeys get end-to-end tests. Component and rule tests cover its guards and computed values.

### D3. Every test is deterministic

- Every random input has a seed set in one place per package.
- No test reads the wall clock. Tests use fake timers or Playwright's `page.clock`.
- No test waits a fixed time.
- A test that fails once with no code change is a bug, and becomes a task the same day.

### D4. A test review every two weeks

The review runs with the refactor scan and writes `docs/reviews/test-review-<UTC timestamp>.md`. It:

- runs each package's tests 5 times with new seeds and reports any failure
- lists behaviour tested at two layers
- lists tests slower than 1 s
- flags modules with more than 3 test lines per source line
- lists tests that name a removed feature or a closed task

Each finding becomes a `chore` brief, at most three per review.

## Consequences

- Briefs get longer, and implementers guess less about what to test.
- The end-to-end suite shrinks, and so does its run time.
- Property tests stop finding new failures during normal runs. The fortnightly review runs new seeds instead.
- Mutation testing would show which tests catch nothing. It needs a new dependency, so it waits for a later decision.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-11-27T21:48:16Z | Approved | From `docs/reviews/test-suite-audit-20261123T210553Z.md`. Tech lead: "approve, do phase 1 first then the test tasks". |
