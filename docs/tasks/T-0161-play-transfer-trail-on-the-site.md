---
id: T-0161
title: Draw the Transfer Trail board for one player
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/transfer-trail/TrailBoard.svelte
  - apps/web/src/routes/games/transfer-trail/TrailBoard.svelte.test.ts
  - apps/web/src/routes/games/transfer-trail/trail-words.ts
  - apps/web/src/routes/games/transfer-trail/trail-words.test.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

Transfer Trail comes to the site in three screen tasks: this board, the
page that runs a round (T-0165) and the end-to-end tests (T-0166). The
first build of all three (commit a6a5384, kept on `spike/t-0161-full`) was
909 lines, over the 400-line ceiling in AGENTS.md rule 4, so it was split on
2026-11-23. Carry this task's part over from that commit.

The board shows one player's question: their card face, their clubs to
place, the trail, and the result of a check.

## Context

- `prototype/soccer-cards-prototype.html`, the Transfer Trail screen
  (`#games-trail` and the code under "Transfer Trail") is the approved look.
- `packages/game`: `TrailStep`, `TrailCheck`, `ClubId`.
- `apps/web/src/lib/cards/CardFront.svelte` for the card face.
- `sveltekit-web`, `child-safety-privacy`, `ts-testing`.

## Acceptance criteria

- `TrailBoard` takes one dealt step (the player's clubs in the dealt order,
  with display names and years), the card face, and the check result when
  there is one. It holds no rule of its own and pays nothing.
- Clubs show as buttons in the dealt order. A tap moves a club into a
  numbered trail; a tap on a trail club takes it back.
- "Check" appears only when the trail is full, and tells the page the order
  the child chose.
- After a check, a right trail says so. A wrong one shows the right order
  with each club's years and marks each place in words ("right place",
  "you put X here") as well as colour.
- "Next player", or "Finish round" on the last player, tells the page to
  carry on.
- `trail-words.ts` holds the board's words: the check result and the place
  marks, and "to now" for a spell with no end year.
- Every club button's accessible name is the club's name. The board works
  with a keyboard alone, and focus moves sensibly after each tap. Nothing
  animates.

## Edge cases

- A double tap on a club adds it once.
- A double tap on "Check" can't land on "Next player" and skip the result.
- Long club names ("Real Madrid Club de Fútbol") wrap inside the button at
  320 pixels.
- Two clubs with the same name both show; either can go in either place.

## Tests

- `TrailBoard.svelte.test.ts`: placing and taking back, Check only when
  full, a right and a wrong result in words, Finish round on the last
  player, the double tap on Check, and two clubs with the same name.
- `trail-words.test.ts`: each piece of wording, including "to now".

## Out of scope

- Loading careers, starting a round, paying and saving coins, the finish
  screen (T-0165) and the end-to-end tests (T-0166).
