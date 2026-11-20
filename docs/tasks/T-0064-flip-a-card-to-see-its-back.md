---
id: T-0064
title: Flip a card to see its back
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/cards/**
dependencies: []
max_changed_lines: 260
status: ready
---

## Goal

A child taps a card and it turns over to show its back, as in the approved
prototype.

## Context

- `prototype/soccer-cards-prototype.html`: the flip in `bigCard`.
- `CardFront` (T-0051, T-0061) and `CardBack` (T-0052) in
  `apps/web/src/lib/cards/`. Runs after T-0052.
- The `sveltekit-web` skill, "Animation" and "Accessibility".
- The site's Content Security Policy blocks inline `style` attributes, so
  the turn is driven by classes.
- Aim for about 160 changed lines.

## Acceptance criteria

- `FlipCard` shows a front and a back and turns between them on a tap, on
  Enter and on Space. It is one real `button` whose name says which side
  shows and what pressing does.
- The turn animates `transform` only. With reduced motion the sides swap
  with no movement.
- The hidden side is hidden from a screen reader and from the tab order.
- `make check COMPONENT=web` passes.

## Edge cases

- Two quick taps. The card ends on the side the second tap asks for.
- Reduced motion turned on while the card shows its back.

## Tests

- Component tests in `apps/web/src/lib/cards/`: the flip by tap and by
  each key, the reduced-motion variant, the button's name on each side,
  and what a screen reader is given on each side.

## Out of scope

- The detail dialog that holds a big card. The collection task adds it.
