---
id: T-0140
title: Grade and publish a mixed batch of 40 more players
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/grades/**
  - data/pipeline/ids.toml
  - data/api/v1/**
  - data/pipeline/tests/test_grades.py
  - data/pipeline/tests/test_published_api.py
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The site grows from 24 to 64 players. The tech lead chose a mix for the
first new batch on 2026-11-21: about 20 Australian players and about 20
European stars. The static `v1` API holds up to 1,000 players, so this
needs no database or API change.

## Context

- ADR 0006 D2 and D4 (grades, tiers, overrides), ADR 0003 D1, D2 and D4
  (facts, photos, fetching), ADR 0008 D6 (who may be in the set).
- T-0081 and T-0084 brought in the first 24 players. Follow how they wrote
  `grades/players.toml`, `grades/overrides.toml` and `grades/photos.toml`.
- Run `uv run --frozen scdata build` from `data/pipeline`. It writes
  `data/api/v1/` and `ids.toml`. The kit treats `data/api/**` as generated:
  it can't be edited by hand and doesn't count towards the line limit.

## Acceptance criteria

- 40 new players, each a Wikidata item with six grades from 1 to 5 and a
  one-line reason per grade that names a public, checkable fact. No number
  on the 1 to 99 scale, and no video game or card maker named.
- About 20 Australian players: Socceroos, Matildas, and Western Sydney
  Wanderers players, current or notable former.
- About 20 European stars from the Premier League, La Liga, Serie A, the
  Bundesliga and Ligue 1, not already in the set.
- At least 8 of the 40 are women, and at least 4 are goalkeepers.
- Every player is a professional, aged 18 or over on 2026-11-21, with a
  public record (ADR 0008 D6). No youth, amateur or community players.
- An Icon override only for an all-time great, with the honours named
  (ADR 0006 D4). Most new players are expected to be BASE or RARE.
- The output was produced only by `scdata build`.
- The tests that pin the count of 24 now pin 64, and the tier spread still
  lets `drawPack` run.
- The report lists the request count and time, the tier spread, and every
  player with an avatar instead of a photo and why.
- `make check COMPONENT=data` passes.

## Edge cases

- A player Wikidata can't resolve: drop them, pick another, and name the
  Q-id in the report.
- A thin Wikidata record (common for A-League players): grade from the
  public facts there are, and write "No standout public record" where a
  skill has none.
- A photo that isn't free or shows advertising: the avatar, with a reason in
  `photos.toml`.
- Two players with one name: the registry's birth-year slug
  (ADR 0005 D2).

## Tests

- `test_grades.py`: the real files load, with the new counts.
- `test_published_api.py`: the committed files match the schema, every photo
  has a credit, the count is 64, and the tier spread lets `drawPack` run.

## Out of scope

- Changing the grades of the first 24 players, the formula, the site and
  the API v2 work.
