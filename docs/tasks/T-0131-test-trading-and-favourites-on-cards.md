---
id: T-0131
title: Test trading and favourites on the Cards page, and word a refused unstar
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/cards/+page.svelte
  - apps/web/tests/cards-trade.spec.ts
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

The Cards page's trade and favourite wiring has no test, and it says "Star removed" even when the removal is refused (T-0124 reviewer F4, F10).

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- `trade`, `toggleFavourite` and `TRADE_REFUSALS` in `routes/cards/+page.svelte`.

## Acceptance criteria

- Trading a double saves, and a reload shows the new card.
- Trading the last copy of a favourite is refused with the prototype's words.
- Starring and unstarring saves and survives a reload.
- A refused unstar says it was refused, not "Star removed".
- `make check COMPONENT=web` passes.

## Edge cases

- What the screen shows when a trade's save is refused waits for the tech lead; this task tests what happens today.

## Tests

- `cards-trade.spec.ts` as above.

## Out of scope

- Rolling the screen back after a refused save.
