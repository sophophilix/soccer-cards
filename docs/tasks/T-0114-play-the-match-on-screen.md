---
id: T-0114
title: Play the match on screen and show the result
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/match/MatchStage.svelte
  - apps/web/src/routes/match/MatchView.svelte
  - apps/web/src/routes/match/commentary.ts
  - apps/web/src/routes/match/commentary.test.ts
  - apps/web/tests/match-play.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

Kick off plays the match. The score, clock and commentary move one moment
at a time, and full time shows who won, the coins earned and any move up a
division.

## Context

- Merge T-0112 first. If its top component is not `MatchView.svelte`, stop
  and tell the lead so the brief's paths are fixed. T-0113 may run at the
  same time; it does not touch these files.
- `lib/match` from T-0111: `startMatch` at kick-off, `finishMatchAndSave`
  at full time. The whole result is known at kick-off; the screen only
  reveals it.
- The prototype's `battlestage`, `startBattle`, `stepBattle`,
  `finishBattle`, `fullTime` and `endBattle`, and its words.

## Acceptance criteria

- Kick off is enabled with 11 picked and opens the match stage.
- The board shows You and AI with scores, and the clock. The plans read
  "You: 4-4-2 · All-out attack" and "AI: …". When a side has the tactical
  edge, the prototype's banner says so.
- One moment shows every 1.1 s, or every 0.15 s with reduced motion. Each
  adds a line to the commentary, newest first, in a polite live region:
  "7' NAME wins the ball for you. NAME shoots… GOAL for you!", or saved by
  the keeper, or just wide. Names come from the card set.
- "Skip to full time" shows every moment at once.
- At full time with a winner: the result panel says "You win!" with the
  coins earned and any division move, or "The AI wins" with the
  prototype's advice. The result is saved once.
- "Play again" goes back to the pick screen with the same team. "Open a
  pack" shows when the player has 5 coins or more.
- A drawn match stops at full time with "It is level, so it goes to
  penalties!" and saves nothing. T-0115 adds the shoot-out.
- Both teams' lines show under the commentary.

## Edge cases

- Leaving the tab or reloading mid-match saves nothing. Nothing is lost,
  because a loss costs no coins.
- Kick off tapped twice: one match.
- The save fails: the result still shows, with the store's notice.

## Tests

- `commentary.test.ts`: the line for each outcome and side.
- `match-play.spec.ts` with a fixed seed: kick off, skip, a win saves the
  coins and record (read back after reload), a loss counts, Play again.

## Out of scope

- The penalty shoot-out (T-0115). Sound, animation beyond the timed
  reveal, and opening a card from the line-up.
