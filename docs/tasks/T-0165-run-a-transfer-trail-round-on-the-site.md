---
id: T-0165
title: Run a Transfer Trail round on the site and pay its coins
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/transfer-trail/+page.svelte
  - apps/web/src/routes/games/transfer-trail/TrailView.svelte
  - apps/web/src/routes/games/transfer-trail/TrailView.svelte.test.ts
  - apps/web/src/routes/games/transfer-trail/trail-words.ts
  - apps/web/src/routes/games/transfer-trail/trail-words.test.ts
  - apps/web/src/routes/games/GamesMenu.svelte
  - apps/web/src/routes/games/GamesMenu.svelte.test.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

A child can play a whole Transfer Trail round at `/games/transfer-trail`.
This is the second of the three screen tasks (see T-0161) and the first
where the game plays in the site's preview. It starts after T-0161 and
T-0164 merge. Carry its part over from commit a6a5384 on
`spike/t-0161-full`, without the key rewriting that T-0164 makes
unnecessary.

## Context

- `prototype/soccer-cards-prototype.html`, Transfer Trail (`startTrail`,
  `ttFinish`) is the approved behaviour.
- The rules in `packages/game`: `startTrailRound`, `openPaidRound`,
  `checkTrailInRound`, `finishTrailRound`. The page holds no rule of its own.
- `TrailBoard` and `trail-words.ts` (T-0161).
- Careers: `loadCareer` with the map from `clubNamesFromList` (T-0164).
- Saving coins: `apps/web/src/lib/state/player-store.ts`, and how the Match
  screen saves a win and words a refused save.
- `GamesMenu.svelte` carries `rel="external"` and `TODO(T-0161)` on the
  Transfer Trail link, added in T-0160 because the page didn't exist yet.

## Acceptance criteria

- The page loads careers for a sample of players, leaves out any whose
  career doesn't load, and starts a round of up to 5 from the rest. If none
  load, it says the game can't start right now, with a link back to Games.
- It shows `TrailBoard` for each player in turn. Coins are paid through the
  rules and saved with the player store, and the masthead coin count
  updates. A failed save says so in words and the round goes on.
- The finish screen says what was earned and offers "Play again" and "Back
  to games". Its words go in `trail-words.ts`.
- `GamesMenu.svelte` links to `/games/transfer-trail` with the typed
  `resolve`, with no `rel="external"` and no TODO.
- No request leaves the site's origin, and no new storage key is written.
- The board starts fresh for each player: it is keyed by player, so no
  placed clubs or result carry over (T-0161 review F2).
- The coin in the right-trail message comes from `TRAIL_RIGHT_COINS`, not a
  number written in the words (T-0161 review F3).

## Edge cases

- Leaving the page mid-round and coming back starts a new round. Coins
  already earned stay earned.
- A second tap on Check, or on Finish, pays nothing more.

## Tests

- `TrailView.svelte.test.ts`: a round of right trails pays and saves the
  expected coins; a career that fails is left out; no careers gives the
  can't-start screen; a failed save is worded and the round goes on; the
  finish screen.
- `trail-words.test.ts`: the finish and save wording.
- `GamesMenu.svelte.test.ts`: the link has no `rel`.

## Out of scope

- The board (T-0161) and the end-to-end tests (T-0166).
- Fetching `clubs.json` once for both the card set and careers. The page
  may fetch it itself.
