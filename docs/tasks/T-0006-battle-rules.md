---
id: T-0006
title: Add the 11 against 11 battle rules
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/battle.ts
  - packages/game/src/battle.test.ts
  - packages/game/src/battle.property.test.ts
  - packages/game/src/testing/**
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 400
status: superseded
---

## Goal

A player with 11 different cards picks a team and plays the computer. The
higher team total wins, and a win pays 5 coins.

## Context

- The prototype's `bestEleven`, `startBattle`, `stepBattle` and `endBattle`
  show the approved behaviour.
- A card's total is its three play stats added together.
- Depends on T-0005. Runs after it, because both change `index.ts`.
- Functions are pure and take the random generator as an argument.

## Acceptance criteria

- Battles are locked until the player owns 11 different cards.
- A team is exactly 11 different cards the player owns.
- The computer samples 16 cards from the whole set and plays the 11 with
  the highest totals.
- The battle result lists 11 rounds. Each round pairs one card from each
  side and carries the running score for both.
- The side with the higher final score wins. Equal scores are a draw.
- A win adds 5 coins and one win to the state. A loss adds one loss. A draw
  changes neither coins, wins nor losses.
- A function returns the player's strongest 11, for a "pick my best team"
  button.
- The team size, the computer's sample size and the prize are named
  constants.
- `make check COMPONENT=game` passes.

## Edge cases

- A team of 10 or 12, a team with a repeated card, and a team with a card
  the player doesn't own each return an error result.
- A card set with fewer than 16 cards returns an error result.
- Cards with equal totals are ordered by id, so the same seed gives the same
  battle.
- A player with exactly 11 different cards.

## Tests

- Unit tests in `battle.test.ts` for each criterion and edge case.
- Property tests in `battle.property.test.ts`: each final score is the sum
  of that side's 11 totals, the winner has the higher score, the same seed
  gives the same battle, and coins change by 0 or 5.

## Out of scope

- A change to how the winner is decided. The tech lead has an open question
  about totals favouring all-round players. It needs its own task.
- Timing and animation of the rounds.
- Battles between two players.
