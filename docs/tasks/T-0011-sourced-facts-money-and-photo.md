---
id: T-0011
title: Change player facts, money and the photo to the types of ADR 0005
component: schema
kind: feature
agent: web-implementer
paths:
  - packages/schema/schemas/v1/**
  - packages/schema/src/**
dependencies: []
max_changed_lines: 340
status: done
---

## Goal

Every fact on the back of a card says where it came from and when, a fee
uses a standard money shape, and a photo carries its credit and licence
with it. This is what lets the site show a photo lawfully.

## Context

- `docs/decisions/0005-api-and-schema-design.md`, D4 and D7.
- AGENTS.md rule 8 and the `game-data-api` skill, for the licence list.
- Runs after T-0010.
- Checked on 2026-11-16: the Protocol Buffers JSON form writes a 64-bit
  integer as a string. D7 keeps `units` as a JSON number, as a stated
  exception.
- The generated type files repeat every description. Aim for about 250
  changed lines. The limit is 340.

## Acceptance criteria

- `clubGoalCount` and `nationalTeamGoalCount` replace `clubGoals` and
  `countryGoals`. Each is an object with `value`, `sourceUri` and
  `retrieveDate`.
- `transferFee` has `currencyCode`, `units` and `nanos` in the shape of
  `google.type.Money`, plus `sourceUri` and `retrieveDate`.
- An award has `displayName`, `sourceUri` and `retrieveDate`.
- `careerStartYear` and `careerEndYear` are optional whole numbers.
- `photo` is an object with `uri`, `widthPx`, `heightPx`, `mimeType` and
  `attribution`. The attribution has `author`, `licenseCode` and
  `sourceUri`, all required.
- `licenseCode` accepts only the SPDX ids of the allowed licences: `CC0-1.0`
  and the `CC-BY` and `CC-BY-SA` versions. Public domain uses `CC-PDM-1.0`.
  Check each id against the SPDX licence list and report what you found.
- `sourceUri` is an absolute `https` URI. `photo.uri` is a path inside the
  API with no host.
- Every property this task adds or renames has a `description`.
- The generated types are regenerated and committed.
- `make check COMPONENT=schema` passes.

## Edge cases

- A fact with `sourceUri` or `retrieveDate` missing is refused, for each
  kind of fact. Review finding T-0002 F1 found this untested.
- A photo with no attribution, or an attribution with a field missing, is
  refused.
- A licence outside the list, such as `CC-BY-NC-4.0`, is refused.
- A negative count, a negative fee and `nanos` outside 0 to 999,999,999 are
  refused.
- A `retrieveDate` of `2026-02-30` passes the pattern. Say so in the
  description, because the pipeline's validate stage checks real dates.
- A `photo.uri` that starts with `http` or `//` is refused.
- A `null` anywhere is refused.

## Tests

- Unit tests in `schema.test.ts`, written before the schema change. Test
  data is invented, with an invented author and source.

## Out of scope

- Fetching or checking a real photo. That is the data pipeline.
- `credits.json` and `index.json`.
- A copy of the licence list anywhere but the schema.
