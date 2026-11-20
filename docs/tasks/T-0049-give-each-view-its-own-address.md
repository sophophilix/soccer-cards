---
id: T-0049
title: Give each of the four views its own address and a way between them
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/**
  - apps/web/src/app.css
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
- T-0048 left two things for this task (its review, F1 and F2). The
  page has no pitch stripes yet, though `--stripe` is defined: axe can't
  measure contrast over a gradient, and the home page's contrast test
  fails when axe sets a check aside. And two light-theme pairs copied
  from the prototype miss WCAG 2.2 AA, which the `sveltekit-web` skill
  sets as the target: white on `--accent` is 4.17 to 1, and `--focus` on
  `--bg` is 2.85 to 1.
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
- The page has the prototype's pitch stripes behind the content. Text
  never sits on the stripes directly: it sits on a surface whose contrast
  axe can measure, and the accessibility tests still fail when axe sets a
  contrast check aside.
- In the light theme, `--focus` becomes the nearest shade of the
  prototype's blue that reaches 3 to 1 against `--bg` and `--surface`,
  and `--accent` the nearest shade of its red that reaches 4.5 to 1 with
  `--accent-ink`. The report gives the old and new values and the measured
  ratios. The dark theme keeps its values if they already pass; say what
  they measure.
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
