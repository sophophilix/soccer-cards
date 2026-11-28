---
id: T-0131
title: Undo a trade that can't be saved, and test trading and favourites
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/cards/+page.svelte
  - apps/web/tests/cards-trade.spec.ts
dependencies: []
max_changed_lines: 300
status: done
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
- A trade whose save is refused is undone on screen: the old card stays, the new one isn't shown, and the store's notice says it couldn't be saved (tech lead, 2026-11-21: "yes to all" to the lead's recommendation).
- `make check COMPONENT=web` passes.

## Edge cases

- A trade refused in another tab: undone, with that tab's notice.

## Tests

- `cards-trade.spec.ts` as above.

## Out of scope

- Changing the trade rules in `packages/game`.
