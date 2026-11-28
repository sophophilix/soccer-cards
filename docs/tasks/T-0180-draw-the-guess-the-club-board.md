---
id: T-0180
title: Draw the Guess the Club board for one question
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/guess-the-club/GuessBoard.svelte
  - apps/web/src/routes/games/guess-the-club/GuessBoard.svelte.test.ts
  - apps/web/src/routes/games/guess-the-club/guess-words.ts
  - apps/web/src/routes/games/guess-the-club/guess-words.test.ts
dependencies: []
max_changed_lines: 330
status: done
---

## Goal

The third Guess the Club task (see T-0178). The board shows one question:
the player's card face, their career as a list with the hidden spells
shown as "?", four club buttons, and after an answer the result. It holds
no rule and pays nothing, so it can run alongside T-0178 and T-0179.

## Context

- `prototype/soccer-cards-prototype.html`, Guess the Club (`#games-club`,
  `renderClub`) is the approved look.
- `apps/web/src/routes/games/connections/ConnectionsBoard.svelte` (T-0172,
  T-0176): follow its patterns: card face in `data-art`, level-2 headings,
  results in words, keys by position, and Next ignoring activation for a
  moment after an answer, shown with `aria-disabled`.
- The years wording from `transfer-trail/trail-words.ts` ("to now").

## Acceptance criteria

- The career is an ordered list. Each spell shows years and "N games, N
  goals", or "games not known" when there's no count. Every hidden spell
  shows "?" with "hidden club" read to a screen reader in its place.
- Four club buttons, two columns, one on a phone. A tap tells the page the
  pick; it answers once.
- After the result: right says "Right! The hidden club was X." and fills in
  the "?"; wrong marks the right club and the pick in words and fills in
  the "?". Next (or "Finish round" on the last) waits a moment, then
  carries on.
- Club buttons are named by the club. Works with a keyboard alone. Nothing
  animates.

## Edge cases

- A double tap or a held Enter on a club answers once and can't press Next.
- A spell with games but no goals shows "N games, goals not known".
- Long club names wrap at 320 pixels.

## Tests

- `GuessBoard.svelte.test.ts`: the hidden "?" and its screen-reader text,
  a pick, right and wrong results in words, Next waiting then working,
  a double tap, Finish round on the last question.
- `guess-words.test.ts`: each piece of wording.

## Out of scope

- The rules, loading careers and the page (T-0181).
