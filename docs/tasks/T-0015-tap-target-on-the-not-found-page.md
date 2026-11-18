---
id: T-0015
title: Make every link and button at least 44 pixels high, starting with the not-found page
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/**
  - apps/web/tests/a11y/**
dependencies: []
max_changed_lines: 120
status: done
---

## Goal

A child can hit the "Go back to the start" link with a thumb. It measures
125 by 18 pixels on a phone today, and no test notices.

## Context

- The `sveltekit-web` skill, "Accessibility": touch targets are at least 44
  by 44 CSS pixels.
- Review finding T-0007 reviewer F2.
- Runs after T-0014, because both use the preview on port 8787.
- Aim for about 70 changed lines. The limit is 120.

## Acceptance criteria

- The app has one base stylesheet, loaded by the layout, that gives links
  and buttons a minimum target of 44 by 44 CSS pixels.
- The stylesheet is served from this origin and breaks no security policy.
- An end-to-end test measures every link and button on the home page and
  the not-found page on all three browser projects and fails under 44.
- `make check COMPONENT=web` passes.

## Edge cases

- A link inside a sentence still gets the minimum height.
- The page has no sideways scroll at 320 pixels wide.

## Tests

- End-to-end test in `tests/a11y/`, written first and seen to fail.

## Out of scope

- Colours, fonts and the card design. The game screens bring those.
- A component library or any new dependency.
