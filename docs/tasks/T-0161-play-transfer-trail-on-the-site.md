---
id: T-0161
title: Play Transfer Trail on the site
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/transfer-trail/**
  - apps/web/tests/transfer-trail.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

A child can play Transfer Trail on the real site, as in the prototype the
tech lead and the kids played (T-0153). It starts after T-0158, T-0159 and
T-0160 merge.

## Context

- `prototype/soccer-cards-prototype.html`, the Transfer Trail screen
  (`#games-trail` and the code under "Transfer Trail") is the approved look
  and behaviour.
- The rules: `startTrailRound`, `checkTrail` and the paying functions in
  `packages/game` (T-0158). The screen holds no rule of its own.
- Careers: `loadCareer` in `apps/web/src/lib/data/load-career.ts` (T-0159).
- Saving coins: `apps/web/src/lib/state/player-store.ts` and how the Match
  screen saves a win and words a refused save.
- The card face: the components the Cards screen uses.
- `sveltekit-web`, `child-safety-privacy`, `ts-testing`.

## Acceptance criteria

- `/games/transfer-trail` plays a round of up to 5 players, as the rules
  give it. Each shows the player's card face, their clubs as buttons in the
  dealt order, and a numbered trail. A tap moves a club into the trail; a
  tap on a trail club takes it back.
- "Check" appears when the trail is full. A right trail says so. A wrong
  one shows the right order with each club's years and marks each place
  right or wrong in words as well as colour. "Next player" (or "Finish
  round" on the last) carries on.
- Coins are paid through the rules and saved with the player store. The
  coin count in the masthead updates. A failed save says so in words and
  doesn't stop the round.
- The finish screen says what was earned and offers "Play again" and "Back
  to games".
- The careers for a round are loaded before it starts. A player whose career
  doesn't load is left out. If too few load to play, the screen says the
  game can't start right now, with a link back to Games.
- Every club button's accessible name is the club's name. The game works
  with a keyboard alone. With reduced motion nothing moves.
- No request leaves the site's origin, and no new storage key is written.

## Edge cases

- A double tap on a club adds it once. A double tap on Check pays once.
- Two tiles with the same club are the same answer in either order.
- A spell with no end year shows "to now".
- Leaving the page mid-round and coming back starts a new round. Coins
  already earned stay earned.
- Long club names ("Real Madrid Club de Fútbol") wrap inside the button at
  320 pixels.

## Tests

- Component tests beside the screen for the trail, the check result in
  words and the finish screen.
- `tests/transfer-trail.spec.ts` with invented players and careers served
  in place of the real files and a fixed random seed: a full round with the
  mouse, a round with the keyboard alone, reduced motion, the coin count
  after the round, a career that fails to load, and widths of 320 and 390
  pixels with no sideways scroll.

## Out of scope

- The rules (T-0158), the career loader (T-0159) and the Games tab (T-0160).
- Other games, short club names and saving a round in progress.
