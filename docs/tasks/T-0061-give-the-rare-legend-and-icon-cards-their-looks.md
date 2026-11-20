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
status: done
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
- T-0051's review (`.sdlc/reviews/T-0051.reviewer.json`) left two should_fix
  findings that didn't fit its limit. They are fixed here, first.
- The second star burst and the foil layer were cut from T-0051 with the
  other tier looks. Put them back for the tiers that have them.

## Acceptance criteria

- `.card` sets `width: 100%`, so the card fills its slot in a flex row or
  a centred grid instead of shrinking to 0 by 0 (T-0051 review F1).
- The avatar's ink and the burst's gold use `--card-ink` and `--booking`,
  not copied hex values (T-0051 review F2).
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

- A component test renders the card inside a flex row and checks it keeps
  its 5 by 7 size.
- Component tests in `apps/web/src/lib/cards/`: each tier gets its own
  class, the base card's class is unchanged, and an axe check of the tier
  word on each ground.

## Out of scope

- The back and the flip (T-0052). Club colours, which no prop carries yet.
