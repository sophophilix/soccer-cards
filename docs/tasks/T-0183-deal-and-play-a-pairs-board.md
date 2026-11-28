---
id: T-0183
title: Deal and play a Pairs board in the game package
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/pairs.ts
  - packages/game/src/pairs.test.ts
  - packages/game/src/pairs.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 330
status: done
---

## Goal

In Pairs (the memory game the tech lead's child asked for, T-0149) a child
turns cards face up two at a time to find matching pairs. The tech lead
asked on 2026-11-24 to build every prototyped game. Pairs comes in five
tasks: the board's rules (this one), coins (T-0184), the board (T-0185),
the page (T-0186) and the browser tests (T-0187).

## Context

- `prototype/soccer-cards-prototype.html`, Memory (`startMemory`,
  `memTap`, `MEM_SIZES`) is the approved behaviour.
- ADR 0009 D6 and ADR 0003 D5: no timer, no lives; random source passed in.
- `packages/game/src/state.ts` (`PlayerState.collection`) and
  `cards.ts` (`CheckedCardSet`, `CardId`).

## Acceptance criteria

- `PAIRS_SIZES` is 6, 8 and 10. `pairsSizesFor(state)` says which sizes the
  player can play: a size needs that many different owned cards.
- `dealPairs(state, cardSet, size, random)` picks `size` different owned
  cards, lays two of each face down in a shuffled order, and refuses a size
  the player can't play.
- `turnCard(board, index)` returns the new board: the first card of a turn
  turns up; the second turns up and ends the turn. Matching cards stay up
  as matched; two that don't match are marked to turn back, and
  `settleTurn(board)` turns them down. The board counts turns (a turn is
  two cards) and says when every pair is found.
- A card that's matched, already up, or tapped while two unmatched cards
  are showing is ignored.

## Edge cases

- The same index tapped twice in one turn turns it once.
- A player who owns several copies of one card still gets one pair of it.

## Tests

- `pairs.test.ts`: each criterion and edge case with invented cards.
- `pairs.property.test.ts` (fast-check): every dealt board holds exactly two
  of each of `size` different owned cards; any sequence of taps never
  matches two different cards and never counts more turns than taps / 2.

## Out of scope

- Coins (T-0184) and `apps/web`.
