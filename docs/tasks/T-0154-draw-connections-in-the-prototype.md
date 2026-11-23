---
id: T-0154
title: Draw the Connections game in the prototype for the kids to try
component: docs
kind: docs
agent: web-implementer
paths:
  - prototype/soccer-cards-prototype.html
dependencies: []
max_changed_lines: 250
status: done
---

## Goal

In Connections the child sees two players and names a club they both played
for (ADR 0009 D1). This is the second of the three games drawn in the
prototype for the kids to try (D3). It starts after T-0153 merges, because
it uses T-0153's career table and games menu.

## Context

- `prototype/soccer-cards-prototype.html` after T-0153: the `CAREERS`
  table, the Games tab and its menu, and Transfer Trail. Reuse their round,
  coin and finish-screen code where it fits.
- ADR 0009 D6 and ADR 0003 D5: questions only from published facts, a wrong
  answer shows the right one and why, coins earned in play, no timer, no
  resetting streak, no lives.
- A shared club means the same club name in both players' `CAREERS`
  entries. They don't need to have been there at the same time.

## Acceptance criteria

- The Games menu gains Connections. Pairs and Transfer Trail work as
  before.
- A round has 5 questions. Each shows two player card faces side by side
  (stacked on a phone) and four club buttons. Exactly one button is a club
  both players had. The other three are clubs from either player's career,
  or from the table, that the two don't share.
- Only pairs of players who share at least one club are asked. When two
  players share more than one club, any shared club shown is right, and
  only one is shown.
- A right answer says so and shows both players' years at that club. A
  wrong answer marks the right club and shows the same years. "Next" carries
  on. Nothing is taken away.
- Coins: 1 for each right answer, 2 more for finishing the round, into
  `S.coins`. The finish screen says what was earned and offers "Play again"
  and "Back to games".
- The same pair isn't asked twice in a round.
- Every button has the club's name as its accessible name. The game works
  with a keyboard alone. With reduced motion nothing moves.

## Edge cases

- Fewer than 5 sharing pairs available: the round is as long as the pairs
  allow. Check how many there are and say so in the report.
- A double tap answers once.
- Leaving the tab mid-round and coming back opens the games menu.

## Tests

- The prototype has no test runner. Play at least two rounds with the
  mouse, one with the keyboard alone and one with reduced motion on, and
  check the layout at 320 and 390 pixels wide. Play Pairs and Transfer
  Trail once each. The report lists what was checked and how, and how many
  sharing pairs `CAREERS` gives.

## Out of scope

- `apps/web`, `packages/game` and `data/`.
- Changing `CAREERS` values, Pairs or Transfer Trail.
- Guess the Club (T-0155).
