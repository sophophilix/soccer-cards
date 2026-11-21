---
id: T-0112
title: Show the Match screen's frame, locked state and division
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/match/+page.svelte
  - apps/web/src/routes/match/MatchView.svelte
  - apps/web/src/routes/match/match-words.ts
  - apps/web/tests/match.spec.ts
dependencies: []
max_changed_lines: 400
status: done
---

## Goal

The Match tab stops saying "Coming soon". A player without 11 different
cards sees why and a way to Packs. A player with 11 sees their division,
what a win pays, and their record. The team picker is T-0116.

## Context

- Merged: T-0111 (`lib/match`). Use it and the player store the way
  `routes/packs/PacksView.svelte` does, including its load and save notices.
- The prototype's `view-battle` markup and `renderBattle`: the locked panel,
  the division chip and the record.
- Words come from the prototype. Division names: Division 4, Division 3,
  Division 2, Division 1, Champions League. Tactic names and tips: All-out
  attack, Counter-attack, Keep the ball, Park the bus. The opponent is "the AI".
- `MatchView.svelte` loads the data and holds the state. `+page.svelte`
  renders it. `match-words.ts` holds the screen's words, including the
  tactic names and tips T-0116 will use.
- The first build was 606 lines. It is split: this task, then T-0116 for
  `PickTeam.svelte`. A first build may exist as a saved patch; the lead
  says where.
- The `sveltekit-web` and `child-safety-privacy` skills.

## Acceptance criteria

- Fewer than 11 different cards: "You need 11 different players for a
  match. You have N." with the prototype's extra line and a button to Packs.
- Otherwise: the division with "N of 3 wins to go up" (or "top division"),
  the AI's packs and the coins a win pays, and wins and losses.
- `make check COMPONENT=web` passes, including axe on the screen.

## Edge cases

- The card set fails to load: a plain message and a retry, as on Packs.
- Storage unavailable: the screen still works and says progress can't be saved.
- A saved collection holding an id the card set no longer has: that card is
  not counted.

## Tests

- `match.spec.ts` end to end: locked with 0 and with 10 cards, the stale id,
  the header with a seeded collection, load error and retry, and storage
  unavailable.

## Out of scope

- Formation, tactic and the line-up (T-0116). Picking players (T-0113).
  Playing the match (T-0114). A shared button style (a later refactor).
