---
id: T-0179
title: Check a Guess the Club answer and pay coins from the economy table
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/guess-the-club-round.ts
  - packages/game/src/guess-the-club-round.test.ts
  - packages/game/src/guess-the-club-round.property.test.ts
  - packages/game/src/economy.ts
  - packages/game/src/economy.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

The second Guess the Club task (see T-0178). A pick is checked, and a round
pays 1 coin for each right answer and 2 for finishing, as in the
prototype. It starts after T-0178 merges.

## Context

- `packages/game/src/connections-round.ts` (T-0171) is the pattern to copy:
  open a paid round, answer each question once, finish once.
- ADR 0010 D1: amounts in `economy.ts` only, with a version.

## Acceptance criteria

- `economy.ts` names `GUESS_RIGHT_COINS = 1` and `GUESS_FINISH_COINS = 2`,
  and `ECONOMY_VERSION` goes up by 1.
- `openGuessRound`, `answerGuess` and `finishGuessRound` behave as their
  Connections counterparts: a right first answer pays 1; a question
  answers once; the finish pays 2 once after every question is answered
  and refuses before; a round pays at most its questions plus 2; nothing
  is taken away and the old state is never changed.

## Edge cases

- An unknown question index or a club that isn't one of the four options
  is a refusal.

## Tests

- `guess-the-club-round.test.ts`: each criterion and edge case.
- `guess-the-club-round.property.test.ts`: never more than questions plus
  2, however answers and finishes repeat.
- `economy.test.ts`: the two rows and the new version.

## Out of scope

- Dealing (T-0178) and `apps/web`.
