---
name: ts-testing
description: "Designs, writes and evaluates TypeScript tests with Vitest, fast-check and Playwright: unit, property, component, end-to-end, accessibility and privacy tests. Use for behaviour changes, test infrastructure, flaky tests and test quality assessment. Requires ts-standards and ts-style-guide."
metadata:
  version: "1.0.0"
---

# TypeScript testing

Read `ts-standards` and `ts-style-guide` first. A feature or fix changes at
least one test, and `sdlc verify` checks that it does.

## What to test where

| Level | Tool | Covers | Lives in |
|---|---|---|---|
| Unit | Vitest in Node | Every rule in `packages/game` and `packages/schema` | Beside the code, `name.test.ts` |
| Property | fast-check | Rules that must hold for every input | Beside the code, `name.property.test.ts` |
| Component | Vitest Browser Mode with `vitest-browser-svelte` | What a component shows and does | Beside the component |
| End-to-end | Playwright | Whole journeys on the built site | `apps/web/tests/` |
| Accessibility | Playwright with axe | Every view | `apps/web/tests/a11y/` |
| Privacy and headers | Playwright | No other host, no cookie, the response headers | `apps/web/tests/privacy/` |

Put a check at the lowest level that can prove it. A pack's mix is a unit
test, not an end-to-end test.

## Rules for every test

- Test behaviour a player or a caller can see. Don't test private functions,
  class names or internal state.
- One behaviour per test. The name states it: `refuses a trade of the last
  favourite`.
- Arrange, act, assert. No branches or loops in a test body.
- A test is deterministic. Pass a seeded generator and a fixed clock. Use no
  real network, no real timers and no sleep.
- Each test builds its own data with a factory function such as
  `aCard({ tier: 'legend' })`. Tests share no mutable state and run in any
  order.
- Assert on the value, not on a snapshot of markup. A snapshot is allowed for
  a small serialised result that a person can read in review.
- Test the failure paths as carefully as the success path.
- A test that fails for a reason other than the behaviour it names is a bug
  in the test. Fix it in the same task.

## Property tests for the game rules

Write these as properties, with the seed as an input:

- A standard pack has exactly 7 base, 2 rare and 1 legend. A jumbo pack has
  15, 3 and 2. No card repeats within a pack.
- The same seed gives the same pack.
- A trade returns a different card of the same tier, and the collection's
  size doesn't change.
- A battle's score is the sum of each side's totals, and the winner has the
  higher score.
- Coins never go below zero, and a refused purchase changes nothing.
- Saving and loading player state gives back the same state, for every
  version that has a migration.

## Component tests

- Render with `vitest-browser-svelte` and find elements by role and
  accessible name.
- Use `expect.element` assertions, which wait and retry.
- Cover: what shows for each state, what a tap or key press does, and the
  reduced-motion variant.

## End-to-end journeys

Each runs on a phone-sized and a desktop-sized project.

1. First visit: two free packs, 20 cards in the collection.
2. Open a pack, add the cards, find them in the collection and the guide.
3. Trade a double. Try to trade a favourite and get refused.
4. Pick 11, battle, win, earn 5 coins, buy a pack.
5. Buy a jumbo pack with 10 coins.
6. Reload and find the same collection. Go offline and reload.
7. Use every view with the keyboard only.

Follow the Playwright guidance: role and text locators, web-first
assertions, isolated tests, nothing from a third party, and a trace on the
first retry.

## Running the site and the tests locally

Everything CI runs also runs on a laptop, with the same commands and no
account or secret (ADR 0001 D8).

| Command | Does |
|---|---|
| `make dev` | Starts the Vite dev server with hot reload, for building a view |
| `make preview` | Builds the site and serves the build with `wrangler dev`, as production serves it |
| `make e2e` | Builds, starts the preview and runs every Playwright test without a visible browser |
| `make e2e-ui` | The same in Playwright's UI mode, to watch and step through a journey |
| `make check COMPONENT=web` | The web gate. It includes `make e2e` |

- End-to-end tests run against the built site on the local preview, never
  against the dev server. The service worker, the offline journey and the
  response headers exist only in the build.
- `playwright.config.ts` starts the preview itself with `webServer`. It
  reuses a preview that is already running, except in CI.
- The projects are a phone in Chromium, a phone in WebKit and a desktop in
  Chromium. The WebKit project stands in for Safari on an iPhone or iPad.
- Install the browsers once with `pnpm exec playwright install chromium
  webkit`. If a browser is missing, the gate is `unavailable`, not a pass.
- A failure keeps its trace, screenshot and video under
  `apps/web/test-results/`. Open a trace with `pnpm exec playwright
  show-trace <file>`. CI uploads the same folder as an artifact.
- An implementer runs `make e2e` before it finishes any task that changes a
  view, a journey or player state, and reports the result.

## Accessibility, privacy and headers

- Run axe on every view and fail on any violation.
- Fail if any page requests a host other than the site's own, or sets a
  cookie (ADR 0003 D6).
- Assert the Content Security Policy and the other headers on the preview
  deployment (ADR 0002 D5).

## Coverage and flaky tests

- Thresholds are in `ts-standards`. Coverage shows what isn't tested. It
  doesn't show that a test is good.
- Unit and component tests never retry. End-to-end tests retry once in CI,
  and a test that passed only on retry is reported.
- A flaky test is fixed or removed within one task. Don't mark it skipped
  without a task id.

## Assessing test quality

When asked to review tests, check that a test would fail if the behaviour
broke. Change the rule in your head: would any test notice? Report rules with
no such test as findings against this skill.
