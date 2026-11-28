---
id: T-0173
title: Run a Connections round on the site and pay its coins
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/connections/+page.svelte
  - apps/web/src/routes/games/connections/ConnectionsView.svelte
  - apps/web/src/routes/games/connections/ConnectionsView.svelte.test.ts
  - apps/web/src/routes/games/connections/connections-words.ts
  - apps/web/src/routes/games/connections/connections-words.test.ts
  - apps/web/src/routes/games/GamesMenu.svelte
  - apps/web/src/routes/games/GamesMenu.svelte.test.ts
dependencies: []
max_changed_lines: 380
status: done
---

## Goal

A child can play a whole Connections round at `/games/connections`, picked
from the Games menu. The fourth Connections task (see T-0170). It starts
after T-0170, T-0171 and T-0172 merge.

## Context

- `apps/web/src/routes/games/transfer-trail/TrailView.svelte` (T-0165) is
  the pattern: load careers with `loadCareer` and the `clubNamesFromList`
  map, start a round from the rules, key the board per question, pay and
  save through the rules and the player store, word a failed save, and
  show a finish screen.
- The rules: `startConnectionsRound` (T-0170), `answerConnection` and
  `finishConnectionsRound` (T-0171). The board: `ConnectionsBoard` (T-0172).
- `prototype/soccer-cards-prototype.html`, the Games menu entry for
  Connections: "Two players. Name a club they both played for."

## Acceptance criteria

- The page loads careers for every player in the card set (on the site's
  own origin), leaves out any that fail, and starts a round of up to 5
  questions. If no sharing pair can be made, it says the game can't start
  right now, with a link back to Games.
- It shows the board for each question in turn, keyed per question. Coins
  are paid through the rules and saved with the player store; the masthead
  updates. A failed save says so in words and the round goes on.
- The finish screen says what was earned and offers "Play again" and "Back
  to games". The coin amounts in the words come from the economy table.
- The Games menu lists Connections after Transfer Trail, linking to
  `/games/connections` with the typed `resolve`.
- No request leaves the site's origin, and no new storage key is written.

## Edge cases

- Leaving mid-round and coming back starts a new round; coins earned stay.
- A second tap on a club or on Finish pays nothing more.

## Tests

- `ConnectionsView.svelte.test.ts`: a round of right answers pays and saves
  exactly the expected coins; a career that fails is left out while the
  rest play; no sharing pair gives the can't-start screen; a failed save is
  worded; a double tap on a club and on Finish pays once.
- `connections-words.test.ts`: the finish and save wording.
- `GamesMenu.svelte.test.ts`: the Connections entry and its link.

## Out of scope

- The browser tests (T-0174) and any change to Transfer Trail.
