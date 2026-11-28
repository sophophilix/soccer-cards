---
id: T-0199
title: Say the cards can't load on the Pairs page, not that there are none
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/games/pairs/PairsView.svelte
  - apps/web/src/routes/games/pairs/PairsView.svelte.test.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

T-0186's review (F1, should_fix). When the card set fails to load for a
player who owns cards, the Pairs page still says "You have no cards yet.
Open a pack" and "Collect N more different cards". Both appear beside the
banner that says the players can't be found. That is wrong for the
player, and it tells them to spend coins on packs they don't need.

## Context

- `.sdlc/reviews/T-0186.reviewer.json`, finding F1.
- `apps/web/src/routes/games/pairs/PairsView.svelte`: the no-cards text
  and the size notes.
- `apps/web/src/routes/games/guess-the-club/GuessView.svelte`: how another
  game words a failed load.

## Acceptance criteria

- When the card set fails to load, the page shows only the failed-load
  message and a way to try again. It shows no size notes and no "no cards
  yet" text.
- When the card set loads, the page behaves as it does now.

## Edge cases

- A player with no saved collection and a failed load sees the failed-load
  message, not the no-cards text.

## Tests

- component: `PairsView.svelte.test.ts`: with `fetch` failing and a saved
  collection, the page shows the failed-load message and no size notes.

## Out of scope

- `PairsPlay` and the Games menu.
