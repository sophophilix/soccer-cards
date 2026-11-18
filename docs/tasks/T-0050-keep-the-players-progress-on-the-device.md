---
id: T-0050
title: Keep the player's progress on the device
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/state/**
  - apps/web/package.json
  - apps/web/tests/**
  - eslint.config.js
  - pnpm-lock.yaml
dependencies:
  - '@soccer-cards/game'
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
- `packages/game/src/state.ts`: `PlayerState`, `STATE_VERSION` and
  `createPlayerState`. `@soccer-cards/game` becomes a workspace dependency
  of the web app. It is this repository's own package, not a download.
- `eslint.config.js` already has a rule about storage; this task makes
  `lib/state` the one place allowed to touch it, if it isn't yet. A change
  there is a change to a guarded file: say exactly what changed in the
  report.
- No view uses the state yet. This task is the module and its tests.
- Aim for about 260 changed lines without the lockfile. The limit is 380.

## Acceptance criteria

- `lib/state` exposes: load the saved state, save a state, and subscribe
  to a change made in another tab. Nothing else in `apps/web` reads or
  writes storage, and a lint rule refuses it.
- The state is stored in `localStorage` under one named key, as JSON, with
  its `version`.
- Loading checks the shape before trusting it: a wrong type, a missing
  field, a negative count, a card count that isn't a whole number.
- A saved state from an older version runs through the migrations in
  order. There is none yet; the list is empty and the mechanism is tested
  with an invented one.
- A state that fails the check, or has a version newer than the app
  knows, is copied to a backup key, replaced by a fresh start, and
  reported to the caller so a view can tell the player in plain words.
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

## Tests

- Unit tests in `apps/web/src/lib/state/` for each criterion and edge
  case, with a stand-in storage that can be made to throw.
- A property test: saving then loading any valid state gives the same
  state back.
- An end-to-end test that a value written through the module survives a
  reload, and that no cookie exists.

## Out of scope

- Showing coins or cards. The views do that.
- The new state fields of T-0047. When that task lands, the version goes
  up and the first real migration is its own task.
