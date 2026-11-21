---
id: T-0108
title: Test the Packs screen's reload, double tap and storage cases
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/tests/packs-progress.spec.ts
  - apps/web/src/routes/packs/**
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

End-to-end tests for the Packs screen's guards (T-0093), split from its
first build.

## Acceptance criteria

- A pending pack survives a reload and goes to the summary.
- Two clicks on Open in one task open one pack.
- Storage unavailable: the pack opens and the screen says progress can't be
  saved on this device; storage full and changed in another tab show their
  messages.
- axe passes while a card shows.
- `make check COMPONENT=web` passes.

## Tests

- `packs-progress.spec.ts` as above.

## Out of scope

- New behaviour; a fix the tests show is needed may go in the view.
