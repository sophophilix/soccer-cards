---
id: T-0158
title: Pick and deal a Transfer Trail round in the game package
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/transfer-trail.ts
  - packages/game/src/transfer-trail.test.ts
  - packages/game/src/transfer-trail.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 380
status: done
---

## Goal

In Transfer Trail a child puts a player's clubs in the order the player
joined them (ADR 0009 D1). The tech lead and the kids played it in the
prototype (T-0153) and asked for it in the real site first. The rules come
in three tasks so each stays reviewable: this one picks and deals a round,
T-0162 checks a trail and T-0163 pays coins. The first build of all three
was 731 lines (commit c8ccf1b on `feat/T-0158-transfer-trail-rules`), over
the 400-line ceiling in AGENTS.md rule 4, so it was split on 2026-11-23.

## Context

- ADR 0009 D6: rules are pure functions in `packages/game` with the random
  source passed in. A question is made only from published facts.
- `prototype/soccer-cards-prototype.html`, Transfer Trail (`startTrail`,
  `ttDeal`), is the approved behaviour.
- `packages/game/src/random.ts` (`Random.sample`), and the style of
  `draw-pack.ts` (results, not exceptions, for refusals).
- Commit c8ccf1b already holds this part (`Career`, `Spell`, `trailOrder`,
  `startTrailRound` and their tests). Keep only that part.

## Acceptance criteria

- A career is a player id and its spells, each with a club id and a start
  year, and an end year when the spell is over. The rules know nothing
  about files or the web.
- `trailOrder(career)` gives the spells in the order the player joined the
  clubs: by start year, keeping the career's order for the same year.
- `startTrailRound(careers, random)` picks 5 different players who each have
  3 or more spells. With fewer than 5 such players it picks all of them.
  With none it returns a refusal, not an empty round.
- Each player's clubs are dealt in a shuffled order that isn't already the
  right order, unless every order is the right one (all spells at one club).

## Edge cases

- A career with an empty spell list or fewer than 3 spells is never picked.
- When two careers share a player id, both are dropped.
- A spell with no end year is the current club and is not a problem.

## Tests

- `transfer-trail.test.ts`: each criterion and edge case with invented
  careers (no real player data in tests).
- `transfer-trail.property.test.ts` (fast-check): for any careers and seed,
  a round has at most 5 distinct eligible players, and each dealt order
  holds the player's own clubs and is only already right when every order
  is.

## Out of scope

- Checking a trail (T-0162) and coins (T-0163).
- `apps/web`, loading careers and saving a round in progress.
