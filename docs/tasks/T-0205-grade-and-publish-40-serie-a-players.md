---
id: T-0205
title: Grade and publish 40 players from the Serie A
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/grades/**
  - data/pipeline/ids.toml
  - data/api/v1/**
  - data/pipeline/tests/test_grades.py
  - data/pipeline/tests/test_published_api.py
dependencies:
  - T-0204
max_changed_lines: 400
status: ready
---

## Goal

Wave 1 of ADR 0008 D6: the top five European leagues. On 2026-11-28 the
tech lead chose about 200 new players, so packs hold a mix of countries
instead of mostly Australians. This is one of five batches of 40, one per
league. This batch is the Serie A.

## Context

- ADR 0006 D2 and D4 (grades, tiers, overrides), ADR 0003 D1, D2 and D4
  (facts, photos, fetching), ADR 0008 D6 (who may be in the set).
- T-0140 is the pattern for a batch: follow how it wrote
  `grades/players.toml`, `grades/overrides.toml` and
  `grades/photos.toml`.
- Run `uv run --frozen scdata build` from `data/pipeline`. It writes
  `data/api/v1/` and `ids.toml`. The kit treats `data/api/**` as
  generated: it can't be edited by hand and doesn't count towards the line
  limit.
- `docs/product/feature-list.md`, P1: the reason for the mix.

## Acceptance criteria

- 40 new players, each a Wikidata item with six grades from 1 to 5 and a
  one-line reason per grade that names a public, checkable fact. No number
  on the 1 to 99 scale, and no video game or card maker named.
- Every new player is in a squad of the Serie A or the Serie A Femminile (the women's
  top division in Italy) in the current season, by Wikidata.
- At least 8 of the 40 are women, and at least 4 are goalkeepers.
- At most 10 of the 40 share a national team. Players capped by
  under-represented national teams in the set (anything but Australia and
  England) are preferred.
- At least 10 of the 40 play for one club, so a later team pack (ADR 0010
  D4) can sell that club. Name the club in the report.
- Every player is a professional, aged 18 or over on 2026-11-28, with a
  public record. No youth, amateur or community players.
- An Icon override only for an all-time great, with the honours named
  (ADR 0006 D4). Most new players are expected to be BASE or RARE.
- No player already in the set is added again or regraded.
- The output was produced only by `scdata build`.
- The tests that pin the player count pin the new count, and the tier
  spread still lets `drawPack` run.
- The report lists the request count and time, the tier spread, the
  national team spread, and every player with an avatar instead of a photo
  and why.
- `make check COMPONENT=data` passes.

## Edge cases

- A player Wikidata can't resolve: drop them, pick another, and name the
  Q-id in the report.
- A player with no senior national team: the build refuses them, because
  the API requires a national team code. Drop them, pick another, and name
  the Q-id in the report.
- A photo that isn't free or shows advertising: the avatar, with a reason
  in `photos.toml`.
- Two players with one name: the registry's birth-year slug (ADR 0005 D2).

## Tests

- `test_grades.py`: the real files load, with the new counts.
- `test_published_api.py`: the committed files match the schema, every
  photo has a credit, the count is the new count, and the tier spread lets
  `drawPack` run.

## Out of scope

- Grades of players already in the set, the formula, the site, the pack
  rules and the API v2 work.
