---
id: T-0049
title: Give each of the four views its own address and a way between them
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/**
  - apps/web/src/lib/ui/**
  - apps/web/tests/**
dependencies: []
max_changed_lines: 340
status: ready
---

## Goal

A child can move between Packs, Match, Cards and Guide, and each has its
own address, so the back button and a reload land where they were.

## Context

- `prototype/soccer-cards-prototype.html`: the header, the bottom tab bar,
  the four views and the `VIEWS` list. In the prototype the views share
  one page; here each is a route (the `sveltekit-web` skill, "Routing and
  rendering").
- Runs after T-0048, which provides the tokens and fonts.
- Each view is an empty, designed placeholder for now: its heading and one
  line saying what will be there. Later tasks fill them.
- Aim for about 220 changed lines. The limit is 340.

## Acceptance criteria

- The routes `/packs`, `/match`, `/cards` and `/guide` exist and are
  prerendered. `/` shows the Packs view's content or sends the player
  there without a flash; say which in the report.
- A layout holds the header with the game's name, and the tab bar with
  the four views, as the prototype draws them at 360 pixels wide and at
  desktop width.
- The current view's tab is marked for sight and for a screen reader
  (`aria-current`).
- Every internal link uses `resolve()`.
- Each tab is at least 44 by 44 CSS pixels, has a visible focus ring, and
  the whole bar works with the keyboard.
- Each page has its own `<title>` and one `h1`.
- The not-found page keeps working and links back to Packs.
- `make check COMPONENT=web` passes, with the end-to-end tests on both
  phone projects and the desktop project.

## Edge cases

- A reload on `/cards` stays on Cards.
- Back after Packs → Cards → Guide returns to Cards.
- Reduced motion: a view change has no movement.

## Tests

- `apps/web/tests/`: a journey through the four views by tap and by
  keyboard, the back button, a reload, and an axe run on each view.
- A component test for the tab bar: which tab is current for each address.

## Out of scope

- Coins in the header. The state task adds them.
- Anything inside a view.
