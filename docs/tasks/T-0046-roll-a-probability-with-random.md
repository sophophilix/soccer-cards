---
id: T-0046
title: Let a game rule roll a probability
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/random.ts
  - packages/game/src/random.test.ts
  - packages/game/src/random.property.test.ts
  - packages/game/src/trade.test.ts
  - packages/game/src/draw-pack.test.ts
  - packages/game/src/state.test.ts
  - packages/game/src/testing/**
dependencies: []
max_changed_lines: 140
status: done
---

## Goal

A match needs to ask "does this happen, with probability p?". `Random` can
only give a whole number or a sample today. This adds the one method the
match and the penalties need.

## Context

- `packages/game/src/random.ts`: the `Random` interface and
  `createRandom`.
- `prototype/soccer-cards-prototype.html`: every `Math.random() < p` in
  `stepBattle` and `takePen`.
- Tests that build a `Random` by hand stop compiling when the interface
  gains a method. `trade.test.ts` has two. Check `draw-pack.test.ts` and
  `state.test.ts` for others. Give each the new method, or move the stubs
  to one helper in `testing/`. No test changes its meaning.
- Split from T-0038 to keep the match task under its limit.
- Aim for about 80 changed lines. The limit is 140.

## Acceptance criteria

- `Random` gains `chance(probability)`, which returns true with that
  probability.
- `chance(0)` is never true and `chance(1)` is always true.
- A probability below 0, above 1 or not a number throws a `RangeError`
  that names the value.
- The same seed gives the same sequence of answers, and a call to
  `chance` moves the sequence on by exactly one step, whatever the
  probability.
- Existing sequences don't change: `nextInt` and `sample` give the same
  values for a seed as before.
- `make check COMPONENT=game` passes.

## Edge cases

- Probabilities of 0, 1, 0.5, a very small one such as 1e-9, `NaN`, -0.1
  and 1.1.
- `chance(0)` and `chance(1)` still use one step of the sequence.

## Tests

- `random.test.ts`: a row per criterion and edge case.
- `random.property.test.ts`: over many seeds, `chance(p)` is true about p
  of the time for a few values of p; the same seed gives the same answers.

## Out of scope

- The match and the penalties.
