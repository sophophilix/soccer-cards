---
id: T-0138
title: Measure the card art contrast from the colours the browser draws
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/a11y/card-art-colours.spec.ts
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

T-0132's axe scan measures none of the card art's text. Every card-front
text node comes back incomplete (`bgOverlap`), and so does every pack and
jumbo label (`pseudoContent`) (T-0132 review F1). A child who reads by sight
gets the overall rating only from the art, so its contrast needs a check
that can fail.

## Context

- `.sdlc/reviews/T-0132.reviewer.json` in the main checkout.
- `apps/web/tests/a11y/card-art.spec.ts` (T-0132) opens each tier's large
  card and the pack shelf. Reuse how it gets there.
- The art: `apps/web/src/lib/cards/BigCard.svelte`, `CardFront.svelte` and
  `CardSlot.svelte`, and the pack art in `apps/web/src/routes/packs/PacksView.svelte`.
  Backgrounds are gradients, so a text node has more than one colour
  behind it.
- WCAG 2.2 SC 1.4.3: 4.5:1 for normal text, 3:1 for large text (24px, or
  18.66px bold).

## Acceptance criteria

- For each tier's large card front and for the sealed pack and jumbo
  labels, the test finds every visible text node, reads its computed
  colour, and measures the contrast against what is drawn behind it. The
  backdrop is either the gradient stops under it, from computed style, or
  pixels sampled from a screenshot with the text hidden. Pick one and say
  why in the report.
- It measures against the worst backdrop colour under the text's box.
- A text node below its threshold fails the test, and the failure names the
  element, its colours and the ratio.
- It runs in light and dark mode.
- If real failures exist, don't fix the art. Mark them `test.fail` with the
  element and ratio, and report them to the lead.
- `make check COMPONENT=web` passes.

## Edge cases

- Text with a shadow or outline: measure the fill colour only, and say so
  in the test.
- Semi-transparent text or backdrop: blend it before measuring.
- A node hidden or of zero size: skip it.

## Tests

- `apps/web/tests/a11y/card-art-colours.spec.ts`. Include one case that
  checks the measure itself, for example a known pair such as `#777` on
  `#fff`, which is about 4.48:1.

## Out of scope

- Changing the card art's colours, `card-art.spec.ts`, and any new
  dependency.
