---
id: T-0186
title: Pick a Pairs board size on the site
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/pairs/+page.svelte
  - apps/web/src/routes/games/pairs/PairsView.svelte
  - apps/web/src/routes/games/pairs/PairsView.svelte.test.ts
  - apps/web/src/routes/games/pairs/pairs-words.ts
  - apps/web/src/routes/games/pairs/pairs-words.test.ts
  - apps/web/src/routes/games/GamesMenu.svelte
  - apps/web/src/routes/games/GamesMenu.svelte.test.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

A child can play Pairs at `/games/pairs` with the cards they own, picked
from the Games menu. The fifth Pairs task (see T-0183). It was split on
2026-11-28 because the whole page came to 529 lines: T-0198 plays and pays
one board, and this task adds the size picker, the page and the menu. It
starts after T-0198 merges.

## Context

- `prototype/soccer-cards-prototype.html`, Memory: the size picker
  ("Collect N more different cards to play this.", "Win N coins.") is the
  approved behaviour.
- Rules: `pairsSizesFor` and `PAIRS_BOARD_COINS`. Play: `PairsPlay`
  (T-0198).
- The collection and card set as the Cards screen loads them.

## Acceptance criteria

- The page shows the three sizes. A size the player can't play is disabled
  with how many more different cards it needs. The others say how many
  coins they win.
- Picking a size shows `PairsPlay` for it. Its "Another board size" comes
  back to the sizes.
- The Games menu lists Pairs first, linking with the typed `resolve`.
- No request leaves the site's origin, and no new storage key.

## Edge cases

- A player with no cards sees every size disabled and a link to open
  packs.

## Tests

- component: `PairsView.svelte.test.ts`: sizes enabled and disabled by
  owned cards, and the no-cards link to Packs.
- component: `PairsView.svelte.test.ts`: picking a size shows the board,
  and "Another board size" returns to the sizes.
- unit: `pairs-words.test.ts`: the size notes.
- component: `GamesMenu.svelte.test.ts`: the entry, its order and its link.

## Out of scope

- Playing and paying a board (T-0198).
- The browser tests (T-0187).
