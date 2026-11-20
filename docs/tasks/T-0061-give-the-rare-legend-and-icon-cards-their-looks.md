---
id: T-0061
title: Give the rare, legend and icon cards their looks
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/cards/**
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

A child can tell a rare, a legend and an icon card from a base card at a
glance, as in the prototype the kids approved.

## Context

- `prototype/soccer-cards-prototype.html`: the `t-rare`, `t-legend` and
  `t-icon` styles, the radiant ground and the foil.
- `apps/web/src/lib/cards/CardFront.svelte` from T-0051, which draws the
  base look and writes every tier in words.
- The site's Content Security Policy blocks inline `style` attributes, so
  each look is a class.
- Runs after T-0051. Aim for about 200 changed lines.

## Acceptance criteria

- Rare, legend and icon cards each have their look from the prototype.
  The base look is unchanged.
- Each tier's word stays on the card.
- Any shine or shimmer is still under reduced motion.
- The tier word on each ground meets WCAG AA contrast.
- `make check COMPONENT=web` passes.

## Edge cases

- Reduced motion: any shine or shimmer on a tier is still.
- Dark theme: the card keeps its own paper and ink.
- The card at 96 pixels wide: the ground and the word stay readable.

## Tests

- Component tests in `apps/web/src/lib/cards/`: each tier gets its own
  class, the base card's class is unchanged, and an axe check of the tier
  word on each ground.

## Out of scope

- The back and the flip (T-0052). Club colours, which no prop carries yet.
