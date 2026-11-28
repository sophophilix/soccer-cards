---
id: T-0189
title: Check the schema's patterns for slow matching without a clock
component: schema
kind: chore
agent: web-implementer
paths:
  - packages/schema/src/schema.test.ts
  - packages/schema/src/pattern-safety.test.ts
dependencies: []
max_changed_lines: 150
status: done
---

## Goal

`schema.test.ts` refuses six 200,000-character inputs and checks that each
takes under 50 ms of wall-clock time. On a loaded machine it fails with no
code change (ADR 0011 D3). It guards against patterns that backtrack on
long input. Keep that guard, without the clock.

## Context

- `packages/schema/src/schema.test.ts`, the test titled "refuses %s of
  200,000 characters in under 50 ms".
- ADR 0011 D3.

## Acceptance criteria

- The six long inputs are still refused, with no timing check.
- A new test reads every `pattern` in every schema and fails on a pattern
  with a quantified group that holds another quantifier, such as `(a+)+`
  or `(\w*)*`.
- The new test reports the schema, the property and the pattern it refused.

## Edge cases

- A pattern with an escaped `+` or `*`, or one inside a character class, is
  not a quantifier.
- A schema with no patterns.

## Tests

- unit: `src/schema.test.ts`: the six long inputs are refused.
- unit: `src/pattern-safety.test.ts`: every schema pattern has no nested
  quantifier, and an invented `(a+)+` is refused.

## Out of scope

- Any change to a schema, and any new dependency.
