---
id: T-0159
title: Load a player's career from the site's player record
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/data/load-career.ts
  - apps/web/src/lib/data/load-career.test.ts
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

Transfer Trail needs each player's clubs in order. The site already loads
the player list and `clubs.json`, but the career spells are only in each
player's own record, `/api/v1/players/<id>.json` (T-0142). This task adds
the loader the Transfer Trail screen (T-0161) calls for the players in a
round.

## Context

- `apps/web/src/lib/data/load-goal-counts.ts` reads the same player record.
  Follow its pattern: the site's own origin only (ADR 0003 D5), a checked
  body, and no throw on a bad file.
- `apps/web/src/lib/data/load-card-set.ts` (`FetchFile`, `CLUBS_PATH`).
- `packages/schema`: `CareerSpell` in the generated player types (`club` is
  `clubs/{club}`, `startYear`, optional `endYear`, optional
  `appearanceCount` and `goalCount`).
- ADR 0009 D6: a question is made only from published facts.

## Acceptance criteria

- `loadCareer(fetchFile, playerId, clubNames)` returns the player's spells
  in the published order, each with the club id, the club's `displayName`
  and the years. `clubNames` maps a club resource name to its display name,
  from `clubs.json`.
- It returns "no career" when the request fails, the body isn't a player
  record, there are no spells, or any spell is malformed or names a club
  that isn't in `clubNames`. A player with no career is left out of the
  game, never shown with a gap.
- It fetches only `/api/v1/players/<id>.json` on the site's own origin, with
  the id encoded.
- The output fits the career type T-0158 takes, so the screen passes it
  straight to the rules. Until T-0158 merges, the type is declared here.

## Edge cases

- A spell whose `endYear` is before its `startYear`, or a year that isn't a
  whole number, makes the career "no career".
- A body with extra fields is fine.
- A `playerId` with `/`, `..` or `%` is encoded, never used as a path.

## Tests

- `load-career.test.ts` with invented records and a fake `fetchFile`: a good
  career, each "no career" case above, the path the fetch asks for, and an
  id that needs encoding.

## Out of scope

- Any screen, the game rules and the data pipeline.
- Short club names. The published `displayName` is shown as it is (for
  example "Real Madrid Club de Fútbol").
