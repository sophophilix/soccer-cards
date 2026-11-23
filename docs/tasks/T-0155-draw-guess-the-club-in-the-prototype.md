---
id: T-0155
title: Draw the Guess the Club game in the prototype for the kids to try
component: docs
kind: docs
agent: web-implementer
paths:
  - prototype/soccer-cards-prototype.html
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

In Guess the Club the child reads a player's career with one club hidden
and picks the missing club (ADR 0009 D1). It's the last of the three games
drawn in the prototype for the kids to try (D3). It starts after T-0154
merges, because it changes the same file.

## Context

- `prototype/soccer-cards-prototype.html` after T-0154: the `CAREERS`
  table, the Games menu, Transfer Trail and Connections. Reuse their round,
  coin and finish-screen code where it fits.
- ADR 0009 D6 and ADR 0003 D5: questions only from published facts, a wrong
  answer shows the right one and why, coins earned in play, no timer, no
  resetting streak, no lives.

## Acceptance criteria

- The Games menu gains Guess the Club. The other three games work as
  before.
- A round has 5 questions, each about a different player with at least 3
  spells. Each shows the player's card face and their career as a list:
  years, games and goals for every spell, with every club named except one,
  shown as "?".
- The hidden spell is the one with the most games. On a tie it's the
  earlier one.
- Four club buttons: the hidden club and three clubs from the table that
  the player never played for.
- A right answer fills in the "?" and says so. A wrong answer marks the
  right club and fills in the "?". "Next" carries on. Nothing is taken
  away.
- Coins: 1 for each right answer, 2 more for finishing the round, into
  `S.coins`. The finish screen says what was earned and offers "Play again"
  and "Back to games".
- Every button has the club's name as its accessible name, and the career
  list can be read by a screen reader in order, with the hidden club read
  as "hidden club". The game works with a keyboard alone. With reduced
  motion nothing moves.

## Edge cases

- The hidden club appears in the player's career more than once (Buffon at
  Juventus twice): every spell at that club is hidden, so the answer isn't
  shown elsewhere in the list.
- A spell with no games published shows its years and "games not known". It
  can't be the hidden spell.
- A spell with no end year shows "now".
- A double tap answers once.
- Leaving the tab mid-round and coming back opens the games menu.

## Tests

- The prototype has no test runner. Play at least two rounds with the
  mouse, one with the keyboard alone, one with a screen reader (VoiceOver)
  and one with reduced motion on, and check the layout at 320 and 390 pixels
  wide. Play each of the other three games once. The report lists what was
  checked and how.

## Out of scope

- `apps/web`, `packages/game` and `data/`.
- Changing `CAREERS` values or the other games.
