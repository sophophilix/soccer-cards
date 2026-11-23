---
id: T-0153
title: Draw the Transfer Trail game in the prototype for the kids to try
component: docs
kind: docs
agent: web-implementer
paths:
  - prototype/soccer-cards-prototype.html
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

ADR 0009 D1 lists three memory games after pairs: Transfer Trail,
Connections and Guess the Club. D3 says each one is drawn in the prototype
before it's built, so the kids can try it. In Transfer Trail the child puts
a player's clubs in the order the player joined them. This task also gives
the prototype the career facts that all three games use, and a menu to
choose a game.

## Context

- `prototype/soccer-cards-prototype.html` is the approved look. T-0149 added
  the Memory tab (`renderMemory`, `startMemory`). Reuse its tokens, card
  faces, buttons, coin counter and state (`S.coins`, `BY_ID`, `sample`,
  `plural`).
- ADR 0009 D6: a question is made only from published facts. A wrong answer
  shows the right one and the fact behind it. Coins are earned in play. No
  timer, no streak that resets, no lives. ADR 0003 D5 says the same.
- The facts come from the published API on `main`:
  `data/api/v1/players/<slug>.json` (`careerSpells`: `club`, `startYear`,
  `endYear`, `appearanceCount`, `goalCount`) and `data/api/v1/clubs.json`
  (`displayName`). Read these files. Don't change them.
- 30 of the prototype's players are in the published set, for example
  Lionel Messi, Erling Haaland, Gianluigi Buffon and Rodri. The other
  prototype players have no published career and are left out of these
  games.
- Use the `frontend-design` skill for the look. Stay inside the prototype's
  style.

## Acceptance criteria

- The prototype holds one career table, `CAREERS`, keyed by the prototype
  player's id. Each entry lists that player's published spells in order,
  with the club's `displayName`, start year, end year (or none for a
  current club), games and goals. A comment above it names the source files
  and the date they were read. Every value matches the published file.
- The tab "Memory" is renamed "Games". It opens a menu of the games: Pairs
  (the T-0149 game, unchanged) and Transfer Trail. Pairs plays exactly as
  before. Five tabs still fit at 320, 360 and 390 pixels wide with no
  sideways scroll.
- A Transfer Trail round has 5 players, each with at least 3 spells. Each
  player's card face is shown with their clubs as buttons in a shuffled
  order. The child taps the clubs from first to last. Each tapped club joins
  a numbered trail under the card, and a tap on a trail club takes it back.
- When the trail is full, a "Check" button shows the answer. A right trail
  says so. A wrong one shows the right order with each club's years, and
  marks the clubs that were in the right place. Either way "Next player"
  carries on. Nothing is taken away for a wrong trail.
- Coins: 1 for each trail right on the first check, and 2 more for
  finishing the round. They go into `S.coins` and the counter updates. The
  finish screen says what was earned and offers "Play again" and "Back to
  games".
- Every club is a button whose accessible name is the club's name. The game
  works with a keyboard alone. With reduced motion nothing moves.
- Leaving the tab mid-round is allowed. Coming back opens the games menu,
  with no message about the old round.

## Edge cases

- A player who went back to a club has it twice on the trail (Buffon:
  Parma, Juventus, Paris Saint-Germain, Juventus, Parma). Two tiles with the
  same name are the same answer in either order.
- Two spells that start in the same year keep the order the published file
  gives. Show the years, so the child can see why.
- A spell with no end year is the current club. The answer says "now".
- A double tap on a club adds it once.
- A published career that doesn't match the club on the prototype card
  (Rodri's published career ends at FC Barcelona from 2026; his card says
  Manchester City) keeps the published facts. List each such player in the
  report, so the tech lead can check the data.

## Tests

- The prototype has no test runner. Play at least two rounds with the mouse,
  one with the keyboard alone and one with reduced motion on. Play Pairs
  once to show it still works. Check the tab bar at 320, 360 and 390
  pixels. The report lists what was checked and how, and how `CAREERS` was
  compared with the published files.

## Out of scope

- `apps/web`, `packages/game` and `data/`. The real game comes after the
  kids' verdict.
- Connections (T-0154) and Guess the Club (T-0155).
- Changing any prototype player's card or the Pairs rules.
