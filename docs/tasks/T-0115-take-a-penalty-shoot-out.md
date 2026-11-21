---
id: T-0115
title: Settle a drawn match with a penalty shoot-out
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/match/Penalties.svelte
  - apps/web/src/routes/match/MatchStage.svelte
  - apps/web/src/routes/match/MatchView.svelte
  - apps/web/src/routes/match/commentary.ts
  - apps/web/src/routes/match/commentary.test.ts
  - apps/web/tests/match-penalties.spec.ts
dependencies: []
max_changed_lines: 400
status: done
---

## Goal

A draw goes to penalties. The player picks a corner to shoot at, then a
corner for their keeper to dive to, until the game's shoot-out rules say
it is over. The winner is recorded like any other result.

## Context

- Merge T-0114 and T-0120 first. Seed a draw the way
  `match-play.spec.ts` does (a four-tier card set and a stubbed
  `crypto.getRandomValues`). `lib/match` `startPenalties`, and the game's
  `takeKick` and `CORNERS`.
- The prototype's `pens` panel, `askPen` and `takePen`, and its words.
- `MatchStage` calls `MatchView`'s full-time handler only for a decided
  match. The shoot-out's winner is saved through the same
  `finishMatchAndSave` path, once. Keep the reveal and Play again working
  for a draw.
- Every screen task so far ran over its limit. If the end-to-end spec
  pushes this past 400, stop and tell the lead rather than cutting tests.

## Acceptance criteria

- On a draw the panel "Penalty shoot-out" shows the shoot-out score and
  "Your kick. Pick where to shoot." or "Their kick. Pick where your keeper
  dives." with Left, Middle and Right buttons.
- Each kick adds a commentary line: "You shoot left, the keeper goes
  right: GOAL!", or SAVED!, or over the bar!
- When the shoot-out is over, the result reads "N – N (N – N on
  penalties)" and is saved once, as in T-0114.
- The corner buttons are disabled while a kick is shown and after the end.

## Edge cases

- A double tap on a corner: one kick.
- Sudden death after five kicks each.
- Reload during the shoot-out: nothing saved.

## Tests

- `commentary.test.ts`: the kick lines.
- `match-penalties.spec.ts` with a seed that draws: the panel, kicks, the
  end, the saved result.

## Out of scope

- Any change to the shoot-out rules.
