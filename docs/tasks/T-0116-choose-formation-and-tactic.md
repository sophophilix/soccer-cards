---
id: T-0116
title: Choose a formation and tactic and show the best team
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/match/PickTeam.svelte
  - apps/web/src/routes/match/MatchView.svelte
  - apps/web/src/routes/match/match-words.ts
  - apps/web/tests/match-team.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

On the Match screen, a player with 11 different cards picks a formation and
a tactic and sees their best team in it, with out-of-position players
marked, and a Kick off button.

## Context

- Merge T-0112 first. `MatchView.svelte` renders `PickTeam.svelte` when the
  player has 11 different cards.
- The prototype's `renderBattle`: formation and tactic choices, the tactic
  hint ("Beats …. Loses to …."), the line totals chip, the lines with
  out-of-position players marked, and the line-up hint.
- `lib/match` and the game's `bestTeam`, `lineUp`, `sideStrength`,
  `FORMATIONS`, `TACTICS`. The tactic names and tips are in `match-words.ts`.
- The first build of T-0112 held this work. A saved patch may exist; the
  lead says where.

## Acceptance criteria

- Four formations and four tactics as toggle buttons with `aria-pressed`.
  The default is 4-4-2 and All-out attack. Changing either redraws the team.
- The tactic hint and the line totals (ATT, MID, DEF, GK) follow the tactic.
- The team is `bestTeam` of the owned cards for the formation. Each line
  shows its cards with name, position and rating. An out-of-position card
  has a dashed outline and its name says so to a screen reader.
- Kick off is present and disabled in this task. T-0114 wires it.
- `make check COMPONENT=web` passes, including axe on the screen.

## Edge cases

- Owned cards that don't fill a formation's lines: the spare cards play out
  of position and the hint says how many.

## Tests

- `match-team.spec.ts` end to end: defaults, a formation change, a tactic
  change with its hint and totals, and an out-of-position card's outline
  and label.

## Out of scope

- Tapping players in or out (T-0113). Playing the match (T-0114). Saving
  the formation, tactic or team.
