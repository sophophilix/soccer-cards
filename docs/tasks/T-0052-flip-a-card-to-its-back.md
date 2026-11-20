---
id: T-0052
title: Draw the back of a card
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/cards/**
  - apps/web/tests/**
dependencies: []
max_changed_lines: 380
status: ready
---

## Goal

The back of a card shows the player's ratings, facts and the photo's
credit, as in the approved prototype. T-0064 turns a card over to show it.

## Context

- `prototype/soccer-cards-prototype.html`: the `.back` styles, `bigCard`,
  the six ratings (or the six goalkeeper ratings), the facts rows and the
  credit line.
- ADR 0003 D3: each card back shows the photo's author and licence.
- The `sveltekit-web` skill, "Animation" and "Accessibility".
- Runs after T-0051.
- Aim for about 240 changed lines. The flip moved to T-0064 before this
  task started, because T-0051 and T-0050 both overran their limits.

## Acceptance criteria

- `CardBack` takes the six ratings with their labels (outfield or
  goalkeeper), the career years, club goals, national team goals, the
  highest transfer fee, the awards, and the photo's author and licence.
  Every fact is optional; an absent one shows no row, never a zero or
  "unknown".
- The back sizes everything from its own width, like `CardFront`, and
  keeps the card's own paper and ink in the dark theme.
- A fee shows in a short form a child reads, such as "€222m".
- The credit line shows the author and the licence as text.
- `make check COMPONENT=web` passes.

## Edge cases

- A goalkeeper: the six labels change.
- A player with no photo: no credit line.
- A player with eight awards: the list does not overflow the card.

## Tests

- Component tests: each fact row present and absent, both rating groups,
  the fee's short form, the credit line, and eight awards fitting.

## Out of scope

- Turning the card over: T-0064.

- The detail dialog that holds a big card. The collection task adds it.
- A link to the Commons page. The credits page has it.
