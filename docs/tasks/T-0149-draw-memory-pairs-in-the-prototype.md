---
id: T-0149
title: Draw the memory pairs game in the prototype for the kids to try
component: docs
kind: docs
agent: web-implementer
paths:
  - prototype/soccer-cards-prototype.html
dependencies: []
max_changed_lines: 350
status: done
---

## Goal

The tech lead's child asked for a memory game: the cards are shuffled and
laid face down, you flip one, then another, and you have to remember where
each card was. ADR 0009 D1 puts memory games first, and D3 says each new
screen is drawn in the prototype before it's built. This task adds the game
to the prototype so the kids can play it and give their verdict.

## Context

- `prototype/soccer-cards-prototype.html` (version 6) is the approved look.
  Reuse its tokens, card faces, card backs, tab bar, coin counter and state
  (`fresh()`, `S.coins`, `owned`).
- ADR 0009 D6: games teach and never punish. ADR 0003 D5: no timers,
  streaks, lives or countdowns.
- Use the `frontend-design` skill for the look. Stay inside the prototype's
  existing style.

## Acceptance criteria

- A fifth tab, "Memory", opens the game. The other four tabs keep working.
- The child picks a board of 6, 8 or 10 pairs. Each pair is two copies of
  one card the child owns. A child who owns fewer distinct cards than the
  board needs sees how many more they need, and the smaller boards stay open.
- The cards are shuffled and laid face down as card backs. Tapping one
  turns it face up with a flip. A second tap turns a second one. If the two
  match, both stay face up. If not, both turn back after about a second.
  A third card can't be turned while two are showing.
- The screen counts turns. A turn is two cards turned face up. It shows no
  timer.
- Finishing a board pays coins into `S.coins`: 3 for 6 pairs, 4 for 8 and 5
  for 10, plus 1 more when the board took no more than twice as many turns
  as it has pairs (12 turns for 6 pairs). A perfect board takes as many
  turns as pairs, so the bonus allows one miss per pair. The finish screen
  says what was earned and offers "Play again" and a different board size.
- The tab bar with five tabs fits a phone: at 320, 360 and 390 pixels wide
  the page doesn't scroll sideways.
- Leaving the tab mid-game is allowed. Coming back starts a new board, with
  no penalty and no message about the old one.
- Every card is a button. A face-up card's accessible name is the player's
  name. The game works with a keyboard alone (Tab, then Enter or Space).
- With reduced motion, cards change face with no flip animation.

## Edge cases

- A double tap on one card turns it once.
- A tap on a card that's already matched does nothing.
- The prototype's two free packs at the start give enough cards for a
  6-pair board. Check this.

## Tests

- The prototype has no test runner. Open it in a browser and play every
  board size, with the mouse and with the keyboard, and with reduced motion
  turned on. The report lists what you checked and how.

## Out of scope

- The real site (`apps/web`) and the game package. Those come after the
  kids' verdict. Other memory games (Transfer Trail, Connections), the
  shop and training.
