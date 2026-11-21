---
id: T-0113
title: Let the player pick their own 11
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/match/PickTeam.svelte
  - apps/web/src/routes/match/team-picks.ts
  - apps/web/src/routes/match/team-picks.test.ts
  - apps/web/tests/match-team.spec.ts
dependencies: []
max_changed_lines: 400
status: done
---

## Goal

The player is the manager. Under the line-up they see all their players
and tap one to put them in or take them out, so a weaker card in the right
place can beat a stronger one.

## Context

- Merge T-0116 first. It builds the pick screen in `PickTeam.svelte`; if it is not
  `PickTeam.svelte`, stop and tell the lead so the brief's paths are fixed.
- The prototype's `pickgrid`, `togglePick`, `best` and `clearteam`, and the
  "N of 11 picked" chip.
- Keep the pick rules in `team-picks.ts` as pure functions with unit tests.

## Acceptance criteria

- "Your players" lists every owned card once, by line (FW, MF, DF, GK),
  then highest rating. Each is a toggle button with `aria-pressed` and a
  label "Pick NAME, POSITION, rating N" or "Take out NAME, …".
- Tapping a player not in the team adds them. Tapping one in the team
  takes them out. The lines, totals and hints redraw at once.
- With 11 already picked, tapping another changes nothing and shows
  "You already have 11. Take one out first." in a polite live region.
- "Pick my best team" puts back `bestTeam` for the formation. "Clear"
  empties the team. The chip reads "N of 11 picked".
- Kick off stays disabled unless exactly 11 are picked.
- Changing the formation keeps the picked players and places them again.

## Edge cases

- A double tap on one player: in then out, never a duplicate.
- 0 picked: the line-up hint reads "Tap players below to fill the team."

## Tests

- `team-picks.test.ts`: add, remove, the cap of 11, best, clear, no duplicates.
- `match-team.spec.ts`: the default screen now expects Kick off enabled,
  since the best 11 are picked.
- The end-to-end spec `match-pick.spec.ts` is T-0119. The first build was
  477 lines; a saved copy may exist, and the lead says where.

## Out of scope

- Playing the match. Saving the team between visits.
