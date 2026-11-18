---
id: T-0025
title: Pin the links a player record may carry and close the test gaps from T-0011
component: schema
kind: fix
agent: web-implementer
paths:
  - packages/schema/schemas/v1/**
  - packages/schema/src/**
dependencies: []
max_changed_lines: 200
status: done
---

## Goal

A player record can't carry a link to an arbitrary site, a link that hides
its real host, or a value long enough to stall the check. The photo's source
link can only be its Wikimedia Commons file page, which is the one link the
site lets a child follow.

## Context

- Review findings on T-0011: security F1, F2 and F3, and reviewer F1, F2
  and F3. The review files are in `.sdlc/reviews/` in the main checkout.
- `docs/decisions/0003-data-photos-and-child-privacy.md`, D2 and D3.
- `docs/decisions/0005-api-and-schema-design.md`, D9: a field's meaning is
  frozen at the first deploy. This task must merge before then.
- `packages/schema/schemas/v1/player.schema.json`: `httpsUri`,
  `photoAttribution`, `goalCount`, `transferFee` and `award`.
- Runs after T-0012, so the design lint already checks the schema, and
  before T-0013, whose examples must use the links this task allows.
- Aim for about 130 changed lines. The limit is 200.

## Acceptance criteria

- `photo.attribution.sourceUri` accepts only a link that starts
  `https://commons.wikimedia.org/wiki/File:`.
- Every other `sourceUri` accepts only `https`, a plain host name, an
  optional port and the characters RFC 3986 allows. It refuses userinfo, a
  backslash, a control character, a space, a bidirectional override and a
  zero-width character.
- Every link and the photo's `author` have a `maxLength`.
- The check refuses a value of 200,000 characters in under 50 ms, for each
  pattern this task writes or changes.
- `author` refuses `<`, `>` and control characters, and its description
  says that it is plain text.
- `goalCount`, `transferFee` and `award` each state `"type": "object"`, and
  the schema compiles with no strict-mode warning.
- A `null` `clubGoalCount` and a `null` `nationalTeamGoalCount` are each
  refused by a test.
- The test row named for a photo on another host passes an object whose
  `uri` names another host.
- The generated types are regenerated and committed.
- `make check COMPONENT=schema` passes.

## Edge cases

- `https://commons.wikimedia.org@evil.example/wiki/File:X.jpg` is refused
  as a photo source.
- `https://commons.wikimedia.org.evil.example/wiki/File:X.jpg` is refused
  as a photo source.
- A Commons file name with spaces written as underscores, with brackets and
  with percent-encoded letters is accepted.
- `https://@` and `https://` with nothing after it are refused.
- A link with a query and a fragment is accepted as a fact's source.
- An international host name is accepted in its `xn--` form only.

## Tests

- Unit tests in `schema.test.ts`, written before the schema change, as
  named tables of accepted and refused values.
- One timing test per pattern, with the long value built in the test.

## Out of scope

- The wording of what `transferFee` and the career years mean (reviewer
  F4). The tech lead decides it.
- Bounds on the career years.
- The licence pattern.
- How the web app shows a source link.
