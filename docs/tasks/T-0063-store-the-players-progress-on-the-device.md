---
id: T-0063
title: Store the player's progress on the device
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/state/**
  - apps/web/tests/**
  - eslint.config.js
dependencies: []
max_changed_lines: 380
status: ready
---

## Goal

A child's cards and coins are still there tomorrow. Progress is saved on
the device after every change and nowhere else.

## Context

- `docs/decisions/0001-stack-and-repository-layout.md`, D6. ADR 0003 D5:
  no cookies, no account, nothing sent anywhere.
- The `sveltekit-web` skill, "Player state". The `child-safety-privacy`
  skill.
- T-0050's check and migrations in `apps/web/src/lib/state/`. Runs after
  T-0050.
- The first build of the whole is on
  `feat/T-0050-keep-the-players-progress-on-the-device` at 5343959. Its
  store, tab handling, lint rule and end-to-end test are the starting
  point.
- `eslint.config.js` has no storage rule yet. This task adds one. A change
  there is a change to a guarded file: say exactly what changed in the
  report.
- No view uses the state yet. This task is the module and its tests.
- Aim for about 280 changed lines. The tech lead raised the limit to 380
  on 2026-11-20 for the review fixes: another tab's save never writes
  (F1), a backup is never overwritten (F2), and a test for another tab
  clearing storage (F4).

## Acceptance criteria

- `lib/state` exposes: load the saved state, save a state, and subscribe
  to a change made in another tab. Nothing else in `apps/web` reads or
  writes storage, and a lint rule refuses it.
- The state is stored in `localStorage` under one named key, as JSON, with
  its `version`.
- Loading parses the text and passes it through T-0050's migrations and
  check.
- A state that fails, or has a version newer than the app knows, is
  copied to a backup key, replaced by a fresh start, and reported to the
  caller so a view can tell the player in plain words.
- When storage is missing or throws, on read or on write, the game runs
  for the session and the caller is told that progress isn't being saved.
- Nothing is read during prerendering.
- No cookie is set, and the existing privacy tests still pass.
- `make check COMPONENT=web` passes.

## Edge cases

- Storage is full on save.
- The stored text isn't JSON.
- Two tabs: a save in one reaches the other through the storage event,
  and a stale tab does not overwrite newer progress without the caller
  being told.
- Private browsing, where `localStorage` exists and throws.
- The backup can't be written: the old progress is kept.
- Another tab writes a state this tab can't read: this tab writes
  nothing, stops saving and tells the caller.
- A backup already exists: it is kept, not overwritten.
- Another tab clears storage.

## Tests

- Unit tests in `apps/web/src/lib/state/` for each criterion and edge
  case, with a stand-in storage that can be made to throw.
- A property test: saving then loading any valid state gives the same
  state back.
- An end-to-end test that no cookie exists after a save. A test that runs
  the store inside a real page (review F3) belongs to the first screen
  that uses it.

## Out of scope

- Showing coins or cards, and wording the outcomes. The views do that.
- A lint rule for `document.cookie`.
