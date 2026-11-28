---
id: T-0147
title: Refuse a NUL character in a player id in the D1 migration
component: data
kind: fix
agent: data-implementer
paths:
  - apps/api/migrations/**
  - apps/api/tests/test_migrations.py
dependencies: []
max_changed_lines: 60
status: done
---

## Goal

T-0146's security review (round 2, F1) found that SQLite's `GLOB` and
`length()` stop reading at the first NUL character. So an id made of `a`,
a NUL, then `<script>/../x` passes the `players.id` CHECK. Only the pipeline
writes D1, and it checks every id in full, so nobody can reach this today.
The CHECK is the second line of defence, and it should refuse what ADR
0005 D2 says isn't a slug.

## Context

- `.sdlc/reviews/T-0146.security-reviewer.json` in the main checkout.
- `apps/api/migrations/0001_create_players.sql` (T-0146).
- No migration has run on a remote database yet. Change
  `0001_create_players.sql` in place rather than adding a second migration.

## Acceptance criteria

- The `id` CHECK also requires `length(CAST(id AS BLOB)) = length(id)`, or
  another test the reviewer confirmed refuses an embedded NUL.
- `test_migrations.py` refuses an id with an embedded NUL, and still accepts
  the three seeded slugs.
- `make check COMPONENT=data` passes.

## Edge cases

- A NUL at the start, in the middle and at the end of an id: all refused.

## Tests

- `test_migrations.py`, as above.

## Out of scope

- The route (T-0136) and the pipeline's own id check.
