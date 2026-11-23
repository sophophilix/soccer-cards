---
id: T-0181
title: Run a Guess the Club round on the site and pay its coins
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/guess-the-club/+page.svelte
  - apps/web/src/routes/games/guess-the-club/GuessView.svelte
  - apps/web/src/routes/games/guess-the-club/GuessView.svelte.test.ts
  - apps/web/src/routes/games/guess-the-club/guess-words.ts
  - apps/web/src/routes/games/guess-the-club/guess-words.test.ts
  - apps/web/src/routes/games/GamesMenu.svelte
  - apps/web/src/routes/games/GamesMenu.svelte.test.ts
dependencies: []
max_changed_lines: 380
status: ready
---

## Goal

A child can play a whole Guess the Club round at `/games/guess-the-club`,
picked from the Games menu. The fourth Guess the Club task (see T-0178).
It starts after T-0177 to T-0180 and T-0173 merge (T-0173 also changes the
Games menu).

## Context

- `apps/web/src/routes/games/connections/ConnectionsView.svelte` (T-0173)
  is the pattern: load careers, start a round, key the board per question,
  pay and save through the rules and the player store, word a failed save,
  show a finish screen.
- Rules: `startGuessRound` (T-0178), `answerGuess` and `finishGuessRound`
  (T-0179). Board: `GuessBoard` (T-0180).
- The prototype's menu line: "Read a career with one club hidden. Pick the
  missing club."

## Acceptance criteria

- The page loads careers for the players in the card set, leaves out any
  that fail, and starts a round of up to 5. If none can be asked, it says
  the game can't start right now, with a link back to Games.
- The board shows each question in turn, keyed per question. Coins are
  paid through the rules and saved; the masthead updates; a failed save is
  worded and the round goes on.
- The finish screen says what was earned (amounts from the economy table)
  and offers "Play again" and "Back to games".
- The Games menu lists Guess the Club after Connections, linking with the
  typed `resolve`.
- No request leaves the site's origin; no new storage key.

## Edge cases

- Leaving mid-round starts a new round; coins earned stay.
- A second tap on a club or on Finish pays nothing more.

## Tests

- `GuessView.svelte.test.ts`: a round of right answers pays exactly the
  expected coins; a failed career is left out; nothing to ask gives the
  can't-start screen; a failed save is worded; a double tap pays once.
- `GamesMenu.svelte.test.ts`: the entry and its link.

## Out of scope

- The browser tests (T-0182) and the other games.
