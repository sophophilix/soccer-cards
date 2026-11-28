---
id: T-0196
title: Flip a face-down Pairs card the first time it turns
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/games/pairs/PairsBoard.svelte
  - apps/web/src/routes/games/pairs/PairsBoard.svelte.test.ts
dependencies: []
max_changed_lines: 120
status: ready
---

## Goal

The two should_fix findings from T-0185's second review. A card that
mounts face down gets its turn from the `.down` class, not from GSAP. So
its first flip up probably tweens from 0 to 0 and doesn't animate. The
reduced-motion test also passes whether or not reduced motion is honoured.
Fix both before T-0186 puts the board on a page.

## Context

- `.sdlc/reviews/T-0185.reviewer.json`, findings F1 and F2.
- `apps/web/src/routes/games/pairs/PairsBoard.svelte`: the `.slot.down
.inner` rule and the `turnCard` call.
- `apps/web/src/lib/ui/motion.ts`: `turnCard` and reduced motion.
- `prototype/soccer-cards-prototype.html`, Memory: the approved flip.

## Acceptance criteria

- A card that mounts face down flips with an animation the first time it
  turns up.
- With reduced motion, a card changes face at once, with no animation.
- Without reduced motion, a card's turn runs as an animation.

## Edge cases

- A card that mounts face up, or matched, shows its front with no flip.
- A face-down card never shows its front, even for one frame.

## Tests

- component: `PairsBoard.svelte.test.ts`: the first turn of a card that
  mounted face down starts at 180 degrees and animates to 0.
- component: `PairsBoard.svelte.test.ts`: with reduced motion the turn is
  at 0 at once. Without it, the turn is still in progress straight after
  the tap.

## Out of scope

- The rules, coins and the page (T-0186).
- `apps/web/src/lib/ui/motion.ts`. If the fix needs it, stop and tell the
  lead.
