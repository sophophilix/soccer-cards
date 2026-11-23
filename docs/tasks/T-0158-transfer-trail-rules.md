---
id: T-0158
title: Add the Transfer Trail rules to the game package
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/transfer-trail.ts
  - packages/game/src/transfer-trail.test.ts
  - packages/game/src/transfer-trail.property.test.ts
  - packages/game/src/economy.ts
  - packages/game/src/economy.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 350
status: ready
---

## Goal

In Transfer Trail a child puts a player's clubs in the order the player
joined them (ADR 0009 D1). The tech lead and the kids played it in the
prototype (T-0153) and asked for it in the real site first. This task adds
its rules as pure functions, so the screen (T-0161) only draws them. It
starts after T-0157 merges.

## Context

- ADR 0009 D6: rules are pure functions in `packages/game` with the random
  source passed in. A question is made only from published facts. A wrong
  answer shows the right one. Coins are earned in play: no timer, no
  resetting streak, no lives.
- ADR 0010 D1: coin amounts live in `economy.ts` only (T-0157).
- `prototype/soccer-cards-prototype.html`, the Transfer Trail section
  (`startTrail`, `ttDeal`, the Check handler, `ttFinish`), is the approved
  behaviour.
- `packages/game/src/random.ts` (`Random.sample`) and the style of
  `draw-pack.ts` and `state.ts` (results, not exceptions, for refusals).

## Acceptance criteria

- A career is a player id and an ordered list of spells, each with a club id
  and a start year (and an end year when the spell is over). The rules take
  careers as input and know nothing about files or the web.
- `startTrailRound(careers, random)` picks 5 different players who each have
  3 or more spells. With fewer than 5 such players it picks all of them.
  With none it returns a refusal, not an empty round.
- Each player's clubs are dealt in a shuffled order that isn't already the
  right order, unless every order is the right one (all spells at one club).
- `checkTrail(spells, answer)` says whether the order is right and, for each
  place, whether the club there is the right one. Two spells at the same
  club are the same answer in either order (Buffon: Parma, Juventus,
  Paris Saint-Germain, Juventus, Parma).
- Coins: 1 for each trail right on its first check, and 2 for finishing the
  round. The amounts are named in `economy.ts` and `ECONOMY_VERSION` goes up
  by 1. Paying returns a new `PlayerState`. A round pays at most 5 + 2
  coins, however many times a check or the finish is repeated.
- A wrong trail takes nothing away.

## Edge cases

- Two spells that start in the same year keep the order the career gives.
- A spell with no end year is the current club.
- A career with an empty spell list, a repeated player id or fewer than 3
  spells is never picked.
- An answer with the wrong number of clubs, or a club that isn't in the
  career, is a refusal, not a wrong trail.

## Tests

- `transfer-trail.test.ts`: each criterion and edge case with invented
  careers (no real player data in tests).
- `transfer-trail.property.test.ts` (fast-check): for any careers and seed,
  a round has at most 5 distinct eligible players; the right order always
  checks right; any order is right exactly when every place matches by club;
  a round never pays more than 7 coins.
- `economy.test.ts`: the two new rows and the new version.

## Out of scope

- `apps/web` and loading careers (T-0159).
- Connections, Guess the Club and Pairs in the site.
- Saving a round in progress. Only coins are saved.
