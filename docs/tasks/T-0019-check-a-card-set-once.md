---
id: T-0019
title: Check a card set once so no rule meets a repeated card id
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/cards.ts
  - packages/game/src/cards.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

A card set is checked in one place before any rule uses it. A set that
lists a card id twice is refused there, so packs, trades and later rules
never have to decide which listing counts.

## Context

- Review finding T-0018 F1: packs use the first listing of a repeated id,
  and `tradeCard` reads every listing. With `base-1` listed as base and
  again as rare, trading a rare card returned `base-1`.
- `packages/game/src/cards.ts` holds `Card`, `CardId` and `toCardId`.
- The `ts-style-guide` skill, for the result type and the error names.
- Aim for about 70 changed lines. The limit is 120.

## Acceptance criteria

- `checkCardSet(cards)` returns the same cards as a checked card set when
  every id appears once.
- It returns a refusal that names the first repeated id when an id appears
  twice, whether the two listings share a tier or not.
- It returns a refusal for an empty list.
- It does not change, sort or copy the cards' fields.
- The function and its result type are exported from the package index.
- `make check COMPONENT=game` passes.

## Edge cases

- A list of one card is accepted.
- Ids that differ only by letter case are different ids.
- An id such as `__proto__` or `constructor` is counted like any other id.
- Three listings of one id give one refusal, for that id.

## Tests

- Unit tests in `cards.test.ts`: one test per criterion and edge case.

## Out of scope

- `packs.ts` and `trade.ts`. They keep their current behaviour and
  signatures. Making them take only a checked card set is a later task.
- Loading card data from the API.
