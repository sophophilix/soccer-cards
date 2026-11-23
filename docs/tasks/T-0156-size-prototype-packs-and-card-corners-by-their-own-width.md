---
id: T-0156
title: Size the prototype's packs and card corners by their own width
component: docs
kind: docs
agent: web-implementer
paths:
  - prototype/soccer-cards-prototype.html
dependencies: []
max_changed_lines: 80
status: done
---

## Goal

In a wide window the prototype's packs have huge dots and round corners
(tech lead's screenshot, 2026-11-23). A `cqw` unit on an element measures
the nearest container above it, not the element itself. With no container
above, it measures the window. So every size the prototype gives in `cqw` on
an element that is its own size container grows with the window. Measured
on the Soccer Cards pack: corner radius 11.7 px at a 390 px window and 39 px
at 1300 px, where it should be 3% of the pack's width (about 4 to 6 px). The
real site fixed the same fault in `e9d226a` and in
`apps/web/src/lib/ui/controls.css`, but the prototype never got the fix.

## Context

- `prototype/soccer-cards-prototype.html`. These rules set `cqw` sizes on
  an element that is itself `container-type: inline-size`:
  - `.pack`: `border-radius`, the dot background size, `box-shadow` and
    `gap`; also the `border-radius` of `.pack::before` and `.pack::after`.
  - `.slot`: `border-radius`.
  - `.missing`: `border-radius`, `gap` and `padding`.
  - `.card.big`: `border-radius`.
- The site's answer, in `apps/web/src/lib/ui/controls.css` around line 315:
  a custom property holding one hundredth of the element's own width, used
  in place of `cqw` on the element's own properties. Children keep `cqw`.
  Another way is to move the property to a child. Either is fine.
- The card art inside `.card` (`.face`, `.plate` and so on) is a child of
  the container and is already right. Don't change it.

## Acceptance criteria

- At window widths of 390 px and 1300 px, each of these measures against
  the element's own width, the same at both window widths for the same
  element width, within 0.5 px:
  - the Soccer Cards pack and the Jumbo pack: corner radius 3% of their
    width and dot spacing 3.4% of their width
  - a card slot in the Cards grid: corner radius 5% of its width
  - a "not collected yet" box in the Guide: corner radius 5% of its width
  - the big card in the card detail: corner radius 5% of its width
- No other rule changes. At a 390 px window, the packs, cards and Guide
  look the same as before apart from the sizes above.

## Edge cases

- `.pack.jumbo` has a different width from `.pack`. Its sizes follow its
  own width.
- The pack's tear animation and reduced motion behave as before.

## Tests

- The prototype has no test runner. Measure the computed corner radius and
  background size of each element above at 390 px and 1300 px window widths
  (Chromium is fine), before and after, and put the numbers in the report.
  Look at the Packs, Cards and Guide tabs at 1300 px.

## Out of scope

- `apps/web`. Its `.cardtap` focus ring in `PacksView.svelte` uses `cqw`
  with no container of its own. That's a separate task if it matters.
- The games and any other prototype rule.
