---
id: T-0040
title: Field the computer's team for a division
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/divisions.ts
  - packages/game/src/divisions.test.ts
  - packages/game/src/divisions.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

The computer has a team to play against, and it gets stronger with each
division: it opens more packs and fields the best 11 it finds.

## Context

- `prototype/soccer-cards-prototype.html`: `DIVISIONS` and `aiSide`.
- Runs after T-0042, T-0037 and T-0038, which exports the tactic ids. The computer opens its packs with
  `drawPack`, picks its team with `bestTeam`, and chooses from the
  formations of T-0037 and the tactics of T-0038.
- Split in two: this task is the divisions table and the computer's side.
  T-0047 pays the player and moves them up.
- Aim for about 200 changed lines. The limit is 300.

## Acceptance criteria

- The divisions, from the bottom: Division 4 (the computer opens 2 packs,
  a win pays 4 coins), Division 3 (6 packs, 5 coins), Division 2 (15, 6),
  Division 1 (35, 8) and Champions League (80 packs, 10 coins, form +1%).
  They are one exported constant, in that order.
- `computerSide(division, cardSet, random)` opens the division's number
  of standard packs with `drawPack`, keeps opening until it holds 11
  different cards, picks one of the four formations and one of the four
  tactics at random, and returns the formation, the tactic, the division's
  form bonus and its best team for that formation.
- A card set that `drawPack` refuses returns that refusal.
- A card set with fewer than 11 different cards returns an error result.
  It never loops for ever.
- `make check COMPONENT=game` passes.

## Edge cases

- A set with exactly 11 different cards. The side is those 11.
- The top division's form bonus is 1 and every other division's is 0.
- The same seed gives the same side.

## Tests

- Unit tests for each criterion and edge case, with a stub `Random`.
- Property tests: the team is 11 different cards from the set; the
  formation and the tactic are always from their lists; the same seed
  gives the same side.

## Out of scope

- The player's coins, wins and division. T-0047 owns them.
- The match itself.
