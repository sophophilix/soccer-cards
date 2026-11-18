---
id: T-0047
title: Pay for a win and climb the divisions
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/state.ts
  - packages/game/src/state.test.ts
  - packages/game/src/state.property.test.ts
  - packages/game/src/results.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 260
status: ready
---

## Goal

Winning matters: a win pays coins and counts toward the next division,
where the computer's team is stronger and the prize is bigger.

## Context

- `prototype/soccer-cards-prototype.html`: `WINS_TO_GO_UP`, `endBattle`
  and the `fresh` state.
- Runs after T-0040, which exports the divisions table.
- `packages/game/src/state.ts`: `PlayerState` and `STATE_VERSION`. No
  saved state exists outside tests yet, so the version goes up with no
  migration.
- `state.test.ts` is 176 lines. New tests go in `results.test.ts`.
- Aim for about 170 changed lines. The limit is 260.

## Acceptance criteria

- The player's state gains the division, the wins in it, total wins and
  total losses. A new player starts in Division 4 with none of each.
- `STATE_VERSION` goes up by one.
- A function says whether the player may play a match: they own 11
  different cards.
- Recording a win adds the division's coins, one win, and one win in the
  division. Three wins in a division move the player up one and reset the
  count. The top division has nowhere to go up to.
- Recording a loss adds one loss and changes nothing else. Nothing ever
  moves the player down.
- The number of wins to go up is a named constant.
- `make check COMPONENT=game` passes.

## Edge cases

- The third win in the Champions League. The count keeps rising and the
  division stays.
- A player with 10 different cards and 30 copies in all. No match.
- The test helpers in `testing/` that build a state gain the new fields,
  so no existing test changes its meaning.

## Tests

- `results.test.ts`: a row per criterion and edge case.
- `state.property.test.ts`: over any sequence of wins and losses, coins
  never fall and the division never falls.

## Out of scope

- Saving the player's chosen team, formation and tactic.
- Migrating saved state.
- The computer's side and the match.
