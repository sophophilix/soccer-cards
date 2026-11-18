---
id: T-0040
title: Climb the divisions and pay for a win
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/divisions.ts
  - packages/game/src/divisions.test.ts
  - packages/game/src/divisions.property.test.ts
  - packages/game/src/state.ts
  - packages/game/src/state.test.ts
  - packages/game/src/state.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

Winning matters: a win pays coins and counts toward the next division,
where the computer's team is stronger and the prize is bigger.

## Context

- `prototype/soccer-cards-prototype.html`: `DIVISIONS`, `WINS_TO_GO_UP`,
  `aiSide`, `endBattle` and the `fresh` state.
- Runs after T-0036, T-0037, T-0038 and T-0039.
- `packages/game/src/state.ts`: `PlayerState` and `STATE_VERSION`. No
  saved state exists outside tests yet, so the version goes up with no
  migration.
- Aim for about 200 changed lines. The limit is 300.

## Acceptance criteria

- The divisions, from the bottom: Division 4 (the computer opens 2 packs,
  a win pays 4 coins), Division 3 (6 packs, 5 coins), Division 2 (15, 6),
  Division 1 (35, 8) and Champions League (80 packs, 10 coins, form +1%).
- The player's state gains the division, the wins in it, total wins and
  total losses. A new player starts in Division 4 with none.
- A match is locked until the player owns 11 different cards.
- The computer's side opens its division's number of standard packs with
  the player's odds, keeps opening until it has 11 different cards, picks a
  formation and a tactic at random, and fields its best team for that
  formation.
- A win adds the division's coins, one win, and one win in the division.
  Three wins in a division move the player up one and reset the count. The
  top division has nowhere to go up to.
- A loss adds one loss and changes nothing else. Nothing ever moves the
  player down.
- Every number above is a named constant.
- `make check COMPONENT=game` passes.

## Edge cases

- The third win in the Champions League. The count keeps rising and the
  division stays.
- A card set too small for the computer to reach 11 different cards. It
  returns an error result and does not loop for ever.
- A state saved with the older version. Loading it is the web app's task;
  here, the type no longer accepts it.

## Tests

- Unit tests for each criterion and edge case.
- Property tests: coins never fall after a match; the division never
  falls; the computer's team is 11 different cards from the set; the same
  seed gives the same computer side.

## Out of scope

- Saving the player's chosen team, formation and tactic. That is a web
  app concern until a brief says otherwise.
- Migrating saved state.
