---
id: T-0164
title: Look up a career's clubs by the slug the club list gives
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/lib/data/load-career.ts
  - apps/web/src/lib/data/load-career.test.ts
dependencies: []
max_changed_lines: 120
status: done
---

## Goal

`loadCareer` (T-0159) looks each spell's club up in `clubNames` by its
resource name, `clubs/{slug}`. The site's own club list,
`clubNamesFromList` in `card-face-from-summary.ts`, gives a map keyed by the
plain `{slug}`. Passed straight through, every career fails to load. The
first build of the Transfer Trail screen (commit a6a5384 on
`spike/t-0161-full`) found this and worked around it by rewriting the keys.
This fix makes the two agree, so the screen needs no workaround.

## Context

- `apps/web/src/lib/data/load-career.ts` (`CLUB_PREFIX`, the lookup).
- `apps/web/src/lib/data/card-face-from-summary.ts` (`clubNamesFromList`,
  `slugOf`). It also checks each club's name for plain text and length,
  which is why the screen should use it.

## Acceptance criteria

- `loadCareer(fetchFile, playerId, clubNames)` takes the map
  `clubNamesFromList` returns, keyed by slug, and finds each spell's club by
  the slug in its `clubs/{slug}` resource name.
- A spell whose `club` isn't `clubs/{slug}`, or whose slug isn't in the map,
  still gives "no career".
- Every other behaviour of `loadCareer` is unchanged.

## Edge cases

- A `club` of `clubs/` with nothing after it gives "no career".
- A `club` with more than one `/` gives "no career".

## Tests

- `load-career.test.ts`: the existing tests use a slug-keyed map, plus a
  test that passes the output of `clubNamesFromList` for an invented
  `clubs.json` body and gets the career back.

## Out of scope

- `card-face-from-summary.ts` and any screen.
