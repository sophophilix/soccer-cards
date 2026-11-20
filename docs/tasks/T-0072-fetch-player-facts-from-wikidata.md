---
id: T-0072
title: A polite, cached HTTP client for Wikimedia
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/http.py
  - data/pipeline/tests/test_http.py
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
dependencies:
  - httpx
max_changed_lines: 320
status: ready
---

## Goal

The pipeline has one HTTP client that identifies itself, respects
Wikimedia's limits and caches replies on disk. T-0078 uses it to read player
facts. (Split from the original T-0072, which came to about 700 lines.)

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
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- A `Retry-After` longer than the client's maximum wait fails at once.
- A non-JSON reply, or a 4xx other than 429, fails at once and caches
  nothing.

## Tests

- `test_http.py`: the User-Agent, the gap between requests, `Retry-After`,
  back-off, the give-up and the cache, against `httpx.MockTransport`.

## Out of scope

- Reading Wikidata entities (T-0078), Commons photos, normalising, grades
  and writing output.
