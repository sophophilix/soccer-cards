---
id: T-0185
title: Draw the Pairs board of face-down cards
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/pairs/PairsBoard.svelte
  - apps/web/src/routes/games/pairs/PairsBoard.svelte.test.ts
  - apps/web/src/routes/games/pairs/pairs-words.ts
  - apps/web/src/routes/games/pairs/pairs-words.test.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The third Pairs task (see T-0183). The board lays the cards face down in a
grid, turns them with a flip when tapped, and shows the turn and pair
counts. It holds no rule and pays nothing, so it can run alongside T-0183
and T-0184.

## Context

- `prototype/soccer-cards-prototype.html`, Memory (`#mem-play`,
  `.grid.memory`, the face-down cover with the "SC" seal) is the approved
  look.
- `apps/web/src/lib/cards/` (card front, the flip used on the Cards
  screen) and `apps/web/src/lib/ui/motion.ts` for reduced motion.
- The other game boards' patterns: card art in `data-art`, level-2
  headings, results in words.

## Acceptance criteria

- The board takes the cards in board order (each face up, down or
  matched), the turn count and the pair count, and tells the page which
  card was tapped.
- Cards sit in a grid: 4 across for 6 and 8 pairs, 5 for 10; it fits at
  320 pixels with no sideways scroll.
- A face-down card shows the cover; a face-up card shows its front with a
  flip. Matched cards show a "matched" outline.
- Every card is a button. A face-down card is named "Face-down card N"; a
  face-up card is named by the player, with ", matched" when matched.
- A status line says "Turn a card.", "Now turn a second card.", "A match:
  NAME!" or "Not the same. Remember where they are."
- With reduced motion, cards change face with no flip.

## Edge cases

- A double tap on one card tells the page once.

## Tests

- `PairsBoard.svelte.test.ts`: names for each card state, the counts, a
  tap reported once, the status wording, no flip under reduced motion.
- `pairs-words.test.ts`: each line.

## Out of scope

- The rules, coins and the page (T-0186).
