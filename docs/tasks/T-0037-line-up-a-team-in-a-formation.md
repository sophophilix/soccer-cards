---
id: T-0037
title: Line up a team in a formation
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/lineup.ts
  - packages/game/src/lineup.test.ts
  - packages/game/src/lineup.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 240
status: ready
---

## Goal

Eleven cards become a team on the pitch: a formation says how many play in
each line, and a card played out of its position is worth less there.

## Context

- `prototype/soccer-cards-prototype.html`: `FORMATIONS`, `need`,
  `lineStat`, `lineUp`, `bestTeam`, `OUT_OF_POSITION` and `WRONG_IN_GOAL`.
- Runs after T-0035, which gives a card its position and overall.
- Aim for about 160 changed lines. The limit is 240.

## Acceptance criteria

- The formations are 4-4-2, 4-3-3, 3-5-2 and 5-3-2. Each has one
  goalkeeper and adds up to 11.
- A card's worth in a line is its attack up front, its control in
  midfield and its defence at the back and in goal.
- Out of position, that worth is multiplied by 0.8. A goalkeeper outside
  goal, or an outfield card in goal, is multiplied by 0.5.
- `lineUp` puts cards in their own position first, highest overall first.
  Cards left over fill the gaps from attack to goal and are marked out of
  position.
- `bestTeam` returns the 11 strongest cards for a formation: the best in
  each line by their worth there, then the best of the rest by overall.
- A team that isn't 11 different cards from the set returns an error
  result.
- The factors and the team size are named constants.
- `make check COMPONENT=game` passes.

## Edge cases

- Eleven forwards. One of them ends in goal at half worth.
- No goalkeeper among the cards.
- Cards with equal overall or equal worth are ordered by id, so the result
  doesn't depend on the order they came in.
- Fewer than 11 cards given to `bestTeam`. It returns them all.

## Tests

- Unit tests for each criterion and edge case.
- Property tests: a line-up holds exactly the cards it was given; each
  line has the formation's count when 11 cards are given; no card in its
  own position is marked out of position; `bestTeam` returns no repeated
  card.

## Out of scope

- Tactics and the match itself.
- Saving the player's chosen team.
