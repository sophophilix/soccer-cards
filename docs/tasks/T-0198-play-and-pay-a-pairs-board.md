---
id: T-0198
title: Play a Pairs board of a chosen size and pay its coins
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/pairs/PairsPlay.svelte
  - apps/web/src/routes/games/pairs/PairsPlay.svelte.test.ts
  - apps/web/src/routes/games/pairs/pairs-words.ts
  - apps/web/src/routes/games/pairs/pairs-words.test.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The first half of Pairs on the site. T-0186 came to 529 lines, over the
400 limit, so it is split. This task plays one board of a size it is
given, pays for it and shows the finish screen. T-0186 then adds the size
picker, the page and the Games menu, and shows this component.

## Context

- `prototype/soccer-cards-prototype.html`, Memory: the play screen and the
  finish screen are the approved behaviour.
- Rules: `dealPairs`, `turnCard`, `settleTurn` (T-0183) and `payPairsBoard`
  (T-0184). Board: `PairsBoard` (T-0185, T-0196).
- `apps/web/src/routes/games/guess-the-club/GuessView.svelte`: the pattern
  for loading, paying, saving and wording a failed save.
- The player store for saving coins.

## Acceptance criteria

- Given a size and the owned cards, the component deals a board. Two
  cards that don't match turn back after about a second (`settleTurn`).
  Turns and pairs are counted.
- A finished board pays through `payPairsBoard`, saves, updates the
  masthead, and shows "All N pairs found!" with what was earned, "Play
  again" and "Another board size". A failed save is worded.
- "Play again" deals a fresh face-down board of the same size. "Another
  board size" tells the parent.
- No request leaves the site's origin, and no new storage key.

## Edge cases

- Leaving mid-board clears the mismatch timer, and the next board starts
  fresh with no message about the old one.

## Tests

- component: `PairsPlay.svelte.test.ts`: a board played to the end pays
  exactly the expected coins, with and without the bonus, and saves them.
- component: `PairsPlay.svelte.test.ts`: a mismatch turns back after about
  a second (fake timers).
- component: `PairsPlay.svelte.test.ts`: a failed save is worded and the
  board still finishes.
- component: `PairsPlay.svelte.test.ts`: "Play again" deals a fresh board,
  and "Another board size" calls the parent.
- unit: `pairs-words.test.ts`: the finish line.

## Out of scope

- The size picker, the page and the Games menu (T-0186).
- The browser tests (T-0187).
