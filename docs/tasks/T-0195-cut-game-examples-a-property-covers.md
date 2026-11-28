---
id: T-0195
title: Cut game example tests that a property test already covers
component: game
kind: chore
agent: web-implementer
paths:
  - packages/game/src/economy.test.ts
  - packages/game/src/random.test.ts
  - packages/game/src/trade.test.ts
  - packages/game/src/cards.test.ts
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

Some small game modules have many example tests that check single points
of a rule a property test already covers. `economy.ts` is 24 lines with
14 tests. `random.ts` is 79 lines with 28 example and 5 property tests
(audit finding A5).

## Context

- `docs/reviews/test-suite-audit-20261123T210553Z.md`, finding A5.
- The matching `*.property.test.ts` files.

## Acceptance criteria

- An example test goes when a property test checks the same rule for all
  inputs, unless it is the one example kept to show the rule, or it names
  an edge case.
- `cards.ts` has no property test. Cut only examples that repeat another
  example.
- Line and branch coverage stay at or above 95%.
- The report has a table of every test removed or moved: its old file and
  title, and the test that now covers the behaviour (file and title). A
  removed test with no cover is a `must_fix`.

## Edge cases

- An example that pins a published number, such as a price, stays.

## Tests

- game rules: the remaining example and property tests, all passing, with
  coverage at or above 95%.

## Out of scope

- Any change to source code, and to the property tests.
