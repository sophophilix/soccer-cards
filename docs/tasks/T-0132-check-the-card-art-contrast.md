---
id: T-0132
title: Check the contrast of the card art and the pack lettering once
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/a11y/card-art.spec.ts
dependencies: []
max_changed_lines: 150
status: done
---

## Goal

Every axe scan now excludes `[data-art]`, which takes the card art's name, position and overall out of the contrast check (T-0124 security F5, reviewer F9). A child reading by sight gets the overall only from the art.

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- `CardSlot.svelte`, `CardFront.svelte`, the pack art in `PacksView.svelte`.

## Acceptance criteria

- One axe contrast scan of a large card front (each tier) and of the sealed pack shelf, without the exclusion.
- Any failure is reported to the lead by element and ratio, not fixed here.
- `make check COMPONENT=web` passes, or the spec is marked to show the known failures with the lead's agreement.

## Edge cases

- Text on a gradient that axe can't measure: list it as incomplete in the report.

## Tests

- `tests/a11y/card-art.spec.ts`.

## Out of scope

- Changing the card art's colours.
