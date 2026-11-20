---
id: T-0088
title: Refuse Wikimedia error replies before caching, and record Wikidata's terms
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/http.py
  - data/pipeline/tests/test_http.py
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_wikidata.py
  - THIRD_PARTY.md
  - data/pipeline/src/soccer_cards_data/commons.py
  - data/pipeline/tests/test_commons.py
dependencies: []
max_changed_lines: 320
status: ready
---

## Goal

A Wikimedia reply that is an error (HTTP 200 with an `error` body, such as
`maxlag`) is never cached, and the player's team reply is checked like the
player's own, so a national team can't become a club (T-0078 review F2).

## Context

- T-0072 `http.py` (caches every JSON reply), T-0078 `wikidata.py`. The
  MediaWiki API's error format and `maxlag` behaviour.

## Acceptance criteria

- `http.py` lets a caller pass a check that refuses a reply before it is
  cached; a refused reply raises `FetchError` and writes nothing.
- `wikidata.py` refuses an `error` body for both requests through it.
- A `maxlag` error is retried with back-off like a 503, not cached.
- Licence checks (T-0079) always re-read Commons: a caller can ask the
  client not to use or write the cache for a request, and `commons.py`
  does so, so a photo deleted or relicensed on Commons drops on the next
  run (the `game-data-api` skill, ADR 0003 risks).
- `http.py` can download bytes (for photos) with the same host allow
  list, back-off and a size limit; byte downloads are not cached as JSON.
- `THIRD_PARTY.md` gains a Wikidata row: CC0, the terms page and the date
  read (the `game-data-api` skill).
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- An error body for the team request: no club is made from a national team.

## Tests

- A `maxlag` body: retried, then refused, nothing cached; an error body for
  the team request fails the player read.

## Out of scope

- Other changes to the client.
