---
id: T-0177
title: Load each spell's games and goals with a player's career
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/data/load-career.ts
  - apps/web/src/lib/data/load-career.test.ts
  - packages/game/src/transfer-trail.ts
  - packages/game/src/transfer-trail.test.ts
dependencies: []
max_changed_lines: 150
status: ready
---

## Goal

Guess the Club hides the club where a player played the most games, and
shows games and goals for every spell (ADR 0009 D1, the prototype the tech
lead and the kids played). The career loader (T-0159, T-0164) reads only
clubs and years today. This task adds each spell's games and goals, when
published, so the Guess the Club tasks can use them. The tech lead asked on
2026-11-24 to build every prototyped game.

## Context

- `apps/web/src/lib/data/load-career.ts` and the player schema's
  `CareerSpell` (`appearanceCount`, `goalCount`: sourced facts whose
  `value` is a whole number).
- `apps/web/src/lib/data/load-goal-counts.ts` reads the same shape for the
  card back.
- `packages/game/src/transfer-trail.ts`: the `Spell` type.

## Acceptance criteria

- `Spell` in the game package gains optional `games` and `goals` (whole
  numbers, 0 or more). Transfer Trail and Connections are unchanged.
- `loadCareer` sets `games` from `appearanceCount.value` and `goals` from
  `goalCount.value` when each is a whole number of 0 or more, and leaves
  it out otherwise. A missing or bad count never makes the career "no
  career".

## Edge cases

- A count that is negative, a fraction or not a number is left out.
- A spell with games but no goals keeps its games.

## Tests

- `load-career.test.ts`: both counts present, each missing, each bad.
- `transfer-trail.test.ts`: an existing round still deals with spells that
  carry counts.

## Out of scope

- Any screen, and the Guess the Club rules (T-0178).
