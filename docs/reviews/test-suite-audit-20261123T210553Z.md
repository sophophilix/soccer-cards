# Test suite audit and proposed test strategy

> Status: Approved
> Created: 2026-11-23T21:05:53Z
> Last reviewed: 2026-11-27T21:48:16Z
> Next review: Not scheduled

## Review guide

Decision requested: approve the test strategy in "Proposed strategy". It becomes ADR 0011, which amends ADR 0001 D8 and the testing line in ADR 0009. Then the lead writes the task briefs in "Proposed tasks".

Check these points:

- [ ] Test-first, as defined here, is the rule for feature and fix tasks.
- [ ] Each behaviour is tested once, at the lowest layer that can check it.
- [ ] The full three-browser run checks layout and input only. Everything else runs in one browser.
- [ ] Every random input in a test has a fixed seed, and no test reads the wall clock.
- [ ] A test review runs every two weeks, next to the refactor scan.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

The repository has about 1,000 test cases. Most are in the right place. The cost and the instability sit in three areas:

1. **The end-to-end layer checks things that cheaper layers already check, in three browsers.** Some specs repeat arithmetic the game package tests. Three spec files test config functions and need no browser.
2. **Some tests are not deterministic.** The web package's property test draws new random inputs on every run. One test compares wall-clock time with 50 ms.
3. **Nothing decides which layer owns a behaviour.** Each task adds tests at every layer, and nothing removes them. ADR 0009 requires end-to-end tests for every screen.

The fix is a test strategy, not a one-off cut. The cut follows from the strategy, and the strategy stops the suite from growing back.

## Inventory

Counted on `main` at `f2bb6bc`.

| Layer                                         | Files | Cases            | Test lines  | Source lines |
| --------------------------------------------- | ----- | ---------------- | ----------- | ------------ |
| Web unit and component (Vitest, browser mode) | 34    | 254              | 3,694       | 5,995        |
| Web end-to-end (Playwright, 3 browsers)       | 29    | 143, run 3 times | 3,115       | n/a          |
| Game rules (Vitest, fast-check)               | 32    | 276              | 3,482       | 1,556        |
| Schema                                        | 9     | 27               | 1,231       | 854          |
| Data pipeline (pytest)                        | 14    | about 204        | about 3,300 | 2,477        |
| Player API (pytest)                           | 5     | 21               | 432         | 311          |
| SDLC kit (pytest)                             | 1     | 75               | 726         | 1,176        |

The end-to-end layer costs the most. It takes 69 s and 7.5 GB per run, against 4 s and 2.9 GB for all web unit tests. The architecture review `docs/reviews/local-machine-crashes-20261123T195453Z.md` has the measurements.

## Findings

### A1. Tests in the wrong layer

| Test                                                               | What it checks                         | Better layer                                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `tests/preview-port.spec.ts`                                       | a port number from a folder name       | Vitest, Node                                                                                                               |
| `tests/preview-target.spec.ts`                                     | which URL the config picks             | Vitest, Node                                                                                                               |
| `tests/privacy/worker-config.spec.ts`                              | keys in `wrangler.jsonc`               | Vitest, Node                                                                                                               |
| `tests/match-team-values.spec.ts`                                  | tactic totals such as "ATT 67, MID 60" | already in `packages/game/src/match.test.ts` (`sideStrength`). The browser test only needs to show that the totals appear. |
| `tests/match-play.spec.ts`, three "result panel is a status" tests | one heading per result                 | one component test with three cases                                                                                        |

The three config specs run in three browsers, though none of them opens a page.

### A2. Behaviour tested at two layers

Search terms that mark guard behaviour appear in both component tests and end-to-end specs:

| Behaviour                    | Component tests | End-to-end specs |
| ---------------------------- | --------------- | ---------------- |
| Double tap starts one action | 8               | 5                |
| Reduced motion               | 39              | 10               |
| Another tab changed the save | 5               | 7                |
| Storage full or unavailable  | 21              | 22               |

A guard that one component owns belongs in that component's test. The end-to-end test keeps the cases that cross a page load or a real storage event.

### A3. Every end-to-end test runs in three browsers

`playwright.config.ts` runs every spec in Pixel 7 Chromium, iPhone 15 WebKit and desktop Chromium. Only layout, touch, fonts and tap-target specs differ by engine. Accessibility scans (32 of them, also per colour scheme), header checks and journey checks give the same answer in each engine.

### A4. Tests that are not deterministic

| Problem                                                                                                                   | Where                                                      | Fix                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fast-check with no seed in the web package (the game package seeds every property test in `src/testing/property-seed.ts`) | `apps/web/src/lib/match/play-match.property.test.ts`       | The same setup file for the web package. A scheduled job runs new seeds and reports any failure as a task.                                                  |
| A test passes only if validation takes under 50 ms of wall-clock time                                                     | `packages/schema/src/schema.test.ts:323`                   | Keep the 200,000-character inputs. Replace the timer with a check that has no clock, for example that every pattern in the schema has no nested quantifier. |
| Pure logic runs in a real Chromium                                                                                        | all 34 web unit files, of which only 12 render a component | A Vitest Node project for files that don't render.                                                                                                          |

Fixed sleeps, unseeded `Math.random` and real network calls: none found. The run log names five flaky runs since 2026-11-21. Two were real bugs (hydration, T-0151). The rest happened under parallel load.

### A5. Dense tests for small modules

| Module       | Source lines | Example tests | Property tests |
| ------------ | ------------ | ------------- | -------------- |
| `economy.ts` | 24           | 14            | 0              |
| `random.ts`  | 79           | 28            | 5              |
| `trade.ts`   | 54           | 17            | 3              |
| `cards.ts`   | 93           | 18            | 0              |

Where a property test covers a rule, example tests that check single points of the same rule add little. Keep one example per rule as documentation, and the examples for named edge cases.

### A6. What is in good shape

- The data pipeline, the player API and the kit have about one test line per source line. No cut is proposed.
- No snapshot tests, no fixed sleeps and no skipped tests.
- The privacy and header specs check rules a child-safe site must keep (ADR 0003). They stay, in one browser.

## Proposed strategy

### 1. Test-first, from the brief

Yes, the way forward is test-first, in a form an agent can follow and the kit can check.

1. The brief's acceptance criteria become a **test plan**: one line per criterion, naming the layer and the test.
2. The implementer writes those tests first and commits them. They fail.
3. The implementer writes the code until they pass, then refactors.
4. The reviewer checks that each criterion has exactly one test, at the planned layer.

The plan is the limit as well as the minimum. A test not in the plan needs a reason in the report. This keeps test-first from growing the suite.

### 2. One behaviour, one test, lowest layer

| Layer                      | Owns                                                                      |
| -------------------------- | ------------------------------------------------------------------------- |
| Game rules (Node)          | every rule, number and edge case. Property tests for invariants.          |
| Unit (Node)                | pure web logic: loaders, words, config, headers                           |
| Component (Vitest browser) | what one component shows and does, its guards, its accessibility scan     |
| End-to-end, one browser    | journeys across pages, saved progress across reloads, privacy and headers |
| End-to-end, three browsers | layout, touch, fonts and tap targets only. Tagged `@engines`.             |

An end-to-end test never checks a number a rule computes. It checks that the number appears.

### 3. Determinism rules

- Every random input has a seed set in one place.
- No test reads the wall clock. Use fake timers or Playwright's `page.clock`.
- No test waits a fixed time.
- A test that fails once without a code change is a bug, filed as a task the same day.

### 4. A test review every two weeks

Run it with the refactor scan, using the same report format:

- Run each package's tests 5 times with new seeds. Report any failure.
- List behaviour tested at two layers, using the A2 search.
- List tests that took more than 1 s.
- Count tests per source line by module. Flag modules above 3.
- List tests that name a removed feature or a closed task.

Each finding becomes a `chore` brief, at most three per review. Mutation testing (for example Stryker) would show which tests catch no bug. It needs a new dependency, so it's left for a later decision.

## Proposed tasks

Each is one brief of 400 lines or fewer. They run one at a time until phase 1 of the architecture review lands. The task numbers are placeholders.

| Order | Task                                                                          | Kind  | Component    |
| ----- | ----------------------------------------------------------------------------- | ----- | ------------ |
| 1     | Seed fast-check once per package and replace the 50 ms timer test             | chore | game, schema |
| 2     | Add a Vitest Node project for web files that don't render                     | chore | web          |
| 3     | Move the three config specs from Playwright to the Node project               | chore | web          |
| 4     | Run end-to-end specs in one browser, and only `@engines` specs in three       | chore | web          |
| 5     | Cut end-to-end tests that repeat game rules or one component's guard (match)  | chore | web          |
| 6     | The same cut for packs, cards and transfer trail                              | chore | web          |
| 7     | Cut example tests that a property test covers (economy, random, trade, cards) | chore | game         |
| 8     | Add the test plan section to the brief template and the reviewer's checklist  | docs  | sdlc         |

Task 8 changes kit files. The lead makes it in the main session once the tech lead approves.

## Risks and open items

- A cut can remove the only test of a behaviour. Each cut task lists every removed test and names the test that still covers it. The reviewer checks the list.
- WebKit runs only `@engines` specs. A WebKit-only bug in a journey could reach production. The deploy smoke test in the architecture review covers the main journey.
- Test-first needs the brief to list the tests. Briefs get longer, but implementers guess less.
- The A2 counts come from keyword searches. Each cut task confirms the overlap test by test.

## Review history

| Reviewed at          | Decision  | Notes                                                                                                                                                                                                                  |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-23T21:05:53Z | Drafted   | Audit of all tests on `main` at `f2bb6bc`.                                                                                                                                                                             |
| 2026-11-27T21:48:16Z | Approved  | Tech lead: "approve, do phase 1 first then the test tasks". Strategy recorded as ADR 0011.                                                                                                                             |
| 2026-11-27T22:00:04Z | Corrected | A4 said 30 property tests had no seed. The game package has set one seed for all of them since `cc9fa7a` (PR #16). The scan counted only seeds written in each file. Only the web package's property test is unseeded. |
