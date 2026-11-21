---
id: T-0112
title: Show the Pick your team screen with formation and tactic
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/match/**
  - apps/web/tests/match.spec.ts
  - apps/web/tests/views.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The Match tab stops saying "Coming soon". A player with 11 different cards
sees their best team in a chosen formation and tactic, and a Kick off
button. A player without 11 sees why and a way to Packs.

## Context

- Merge T-0111 first. Use `lib/match` and the player store the way
  `routes/packs/PacksView.svelte` does, including its load and save notices.
- The prototype's `view-battle` markup and `renderBattle`: the locked panel,
  division chip and record, formation and tactic choices, the tactic hint
  ("Beats …. Loses to …."), the line totals chip, the lines with
  out-of-position players marked, and the line-up hint.
- Words come from the prototype. Division names: Division 4, Division 3,
  Division 2, Division 1, Champions League. Tactic names: All-out attack,
  Counter-attack, Keep the ball, Park the bus. The opponent is "the AI".
- The `sveltekit-web` and `child-safety-privacy` skills.
- Name the files so T-0113 and T-0114 can work side by side:
  `MatchView.svelte` loads the data and holds the state, and
  `PickTeam.svelte` draws the pick screen. `+page.svelte` renders
  `MatchView`.

## Acceptance criteria

- Fewer than 11 different cards: "You need 11 different players for a
  match. You have N." with the prototype's extra line and a button to Packs.
- Otherwise: the division with "N of 3 wins to go up" (or "top division"),
  the AI's packs and the coins a win pays, and wins and losses.
- Four formations and four tactics as toggle buttons with `aria-pressed`.
  The default is 4-4-2 and All-out attack. Changing either redraws the team.
- The team is `bestTeam` of the owned cards for the formation. Each line
  shows its cards with name, position and rating. An out-of-position card
  has a dashed outline and its name says so to a screen reader.
- Kick off is present and disabled in this task. T-0114 wires it.
- `make check COMPONENT=web` passes, including axe on the screen.

## Edge cases

- The card set fails to load: a plain message and a retry, as on Packs.
- Storage unavailable: the screen still works and says progress can't be saved.
- A saved collection holding an id the card set no longer has: that card is
  not counted and not shown.

## Tests

- `match.spec.ts` end to end: locked with 0 and with 10 cards, unlocked
  with a seeded collection, formation and tactic changes, the hint text,
  and an out-of-position card's outline and label.
- `views.spec.ts`: the Match view check no longer expects "Coming soon".

## Out of scope

- Tapping players in or out, Clear and Pick my best team (T-0113).
- Playing the match (T-0114). Saving the formation, tactic or team.
