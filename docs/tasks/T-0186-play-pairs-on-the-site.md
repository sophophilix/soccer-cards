---
id: T-0186
title: Play Pairs on the site and pay its coins
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
max_changed_lines: 380
status: ready
---

## Goal

A child can play Pairs at `/games/pairs` with the cards they own, picked
from the Games menu. The fourth Pairs task (see T-0183). It starts after
T-0183 to T-0185 and T-0181 merge (T-0181 also changes the Games menu).

## Context

- `prototype/soccer-cards-prototype.html`, Memory: the size picker
  ("Collect N more different cards to play this.", "Win N coins."), the
  play screen and the finish screen are the approved behaviour.
- Rules: `pairsSizesFor`, `dealPairs`, `turnCard`, `settleTurn` (T-0183)
  and `payPairsBoard` (T-0184). Board: `PairsBoard` (T-0185).
- The collection and card set as the Cards screen loads them, and the
  player store for saving coins.

## Acceptance criteria

- The page shows the three sizes. A size the player can't play is disabled
  with how many more different cards it needs; the others say how many
  coins they win.
- Playing a size deals a board. Two cards that don't match turn back after
  about a second (`settleTurn`). Turns and pairs are counted.
- A finished board pays through `payPairsBoard`, saves, updates the
  masthead, and shows what was earned with "Play again" and "Another board
  size". A failed save is worded.
- The Games menu lists Pairs first, linking with the typed `resolve`.
- No request leaves the site's origin; no new storage key.

## Edge cases

- A player with no cards sees every size disabled and a link to open packs.
- Leaving mid-board starts fresh next time, with no message about the old
  board.

## Tests

- `PairsView.svelte.test.ts`: sizes enabled and disabled by owned cards; a
  board played to the end pays exactly the expected coins (with and without
  the bonus); a failed save is worded; a mismatch turns back (fake timers).
- `GamesMenu.svelte.test.ts`: the entry and its link.

## Out of scope

- The browser tests (T-0187).
