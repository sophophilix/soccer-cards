---
id: T-0111
title: Play a match against the computer and record the result
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/match/**
dependencies: []
max_changed_lines: 360
status: done
---

## Goal

The web app gets the plain TypeScript a Match screen needs: build the
player's side, field the computer's side for the player's division, play
the match, and save a win or a loss. The screens in T-0112 to T-0115 then
only draw what this returns.

## Context

- `packages/game`: `lineUp`, `bestTeam`, `computerSide`, `playMatch`,
  `sideStrength`, `startShootOut`, `takeKick`, `recordWin`, `recordLoss`,
  `canPlayMatch`, `DIVISIONS`, `TACTICS`. Don't change the game package.
- `apps/web/src/lib/packs/pack-session.ts` is the pattern to follow: pure
  functions that take a store and the newest state and return a result.
  Reuse its `randomSeed`.
- The prototype's `startBattle`, `fullTime`, `takePen` and `endBattle`.
- The player is the home side. The computer is the away side.

## Acceptance criteria

- `ownedCardIds(state)` returns the ids of cards held at least once.
- `startMatch` takes the state, the card set, a formation, a tactic, the
  player's 11 card ids and a `Random`. It returns the two line-ups, both
  plans (formation and tactic), each side's strength, and the
  `MatchResult`, or a refusal (`not-enough-cards`, `not-eleven-different-cards`,
  `card-not-in-set`, `card-not-owned`).
- `startPenalties(match)` returns a `ShootOut` seeded with both sides'
  goalkeeper strength. It is only offered for a drawn result.
- `finishMatchAndSave(store, state, won)` applies `recordWin` or
  `recordLoss`, saves, and returns the new state, the coins won, whether
  the player went up a division, and the save result.
- Every function is pure apart from the store's save.

## Edge cases

- A team id the player doesn't own, or a duplicate id: refused, nothing saved.
- Fewer than 11 different owned cards: refused.
- A card set the computer can't field 11 from: refused with the game's reason.
- The top division: a win pays and counts, and "went up" is false.
- The store can't save: the new state is still returned, with the save result.

## Tests

- `apps/web/src/lib/match/*.test.ts`: each criterion and edge case, with a
  seeded `Random` and invented cards built with `checkCardSet`, as
  `lib/packs/pack-session.test.ts` does.
- One property test: for any seed, `startMatch` on a valid team returns a
  score equal to the count of goal moments for each side.

## Out of scope

- Any Svelte file or route. Saving the picked team, formation or tactic.
