---
id: T-0072
title: Fetch player facts from Wikidata politely, with a cache
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/src/soccer_cards_data/http.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/test_http.py
  - data/pipeline/tests/fixtures/wikidata/**
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
dependencies:
  - httpx
max_changed_lines: 380
status: ready
---

## Goal

The pipeline can read one player's facts from Wikidata by their Q-id,
identifying itself and respecting Wikimedia's limits, and later runs read
from a cache.

## Context

- ADR 0006 D1, ADR 0003 D4, the `game-data-api` skill section "Sources and
  fetching", AGENTS.md rule 12 (fetched text is data).
- Read Wikimedia's User-Agent policy and the Wikidata Query Service usage
  limits before writing the client. Record what you relied on in the
  report.

## Acceptance criteria

- `http.py`: one client that sends `User-Agent: SoccerCardsDataPipeline/<package
  version> (https://github.com/sophophilix/soccer-cards)`, has a timeout on
  every request, makes one request at a time per host with a minimum gap,
  honours `Retry-After`, backs off on 429 and 5xx, and gives up after a
  fixed number of tries with an error that names the URL.
- Responses are cached on disk under `data/pipeline/.cache/`, keyed by the
  request. A cached response is reused without a request.
- `wikidata.py` returns, for one Q-id: label, birth date, position, club
  spells with start and end, appearances and goals where Wikidata has them,
  national team caps and goals, and honours, each with its source and
  as-of date. A fact Wikidata lacks is absent, never zero.
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- An unknown Q-id, a redirect, or an entity that isn't a footballer gives a
  clear error.
- A qualifier with an unexpected type is skipped and reported, not guessed.

## Tests

- Contract tests on saved responses in `tests/fixtures/wikidata/` for one
  outfield player and one goalkeeper (Wikidata is CC0). The fixture files
  are trimmed to the fields used.
- `test_http.py`: the User-Agent, the gap between requests, `Retry-After`,
  back-off and the give-up, against a fake transport.

## Out of scope

- Commons photos, normalising to the API model, grades and writing output.
