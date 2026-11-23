---
id: T-0176
title: Key the Connections board's players by position, not name
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/games/connections/ConnectionsBoard.svelte
  - apps/web/src/routes/games/connections/ConnectionsBoard.svelte.test.ts
dependencies: []
max_changed_lines: 80
status: done
---

## Goal

The T-0172 review (finding F1, should_fix) found that `ConnectionsBoard`
keys both of its player lists (the card faces and the years after an
answer) by `player.displayName`. Two players with the same name who share a
club would raise a duplicate-key error in development and draw the wrong
cards in production. T-0172 was at its 330-line limit, so this is its own
task. It starts after T-0172 merges.

## Context

- `apps/web/src/routes/games/connections/ConnectionsBoard.svelte`, the two
  `{#each}` blocks over the question's two players.

## Acceptance criteria

- Both blocks are keyed by the player's position in the question (0 or 1),
  not by name.
- Two players with the same display name show as two cards, each with its
  own years after an answer.

## Edge cases

- Nothing else on the board changes.

## Tests

- `ConnectionsBoard.svelte.test.ts`: a question with two players of the
  same name renders both cards and both years lines.

## Out of scope

- The page (T-0173) and anything outside the board.
