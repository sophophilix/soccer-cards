---
id: T-0052
title: Flip a card to see its back
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

A child taps a card and it turns over to show the player's ratings, facts
and the photo's credit, as in the approved prototype.

## Context

- `prototype/soccer-cards-prototype.html`: the `.back` styles, `bigCard`,
  the six ratings (or the six goalkeeper ratings), the facts rows and the
  credit line.
- ADR 0003 D3: each card back shows the photo's author and licence.
- The `sveltekit-web` skill, "Animation" and "Accessibility".
- Runs after T-0051.
- Aim for about 260 changed lines. The limit is 380.

## Acceptance criteria

- `CardBack` takes the six ratings with their labels (outfield or
  goalkeeper), the career years, club goals, national team goals, the
  highest transfer fee, the awards, and the photo's author and licence.
  Every fact is optional; an absent one shows no row, never a zero or
  "unknown".
- `FlipCard` shows a front and a back and turns between them on a tap, on
  Enter and on Space. It is one real `button` whose name says which side
  shows and what pressing does.
- The turn animates `transform` only. With reduced motion the sides swap
  with no movement.
- The hidden side is hidden from a screen reader and from the tab order.
- A fee shows in a short form a child reads, such as "€222m".
- The credit line shows the author and the licence as text.
- `make check COMPONENT=web` passes.

## Edge cases

- A goalkeeper: the six labels change.
- A player with no photo: no credit line.
- A player with eight awards: the list does not overflow the card.
- Two quick taps. The card ends on the side the second tap asks for.

## Tests

- Component tests: each fact row present and absent, both rating groups,
  the flip by tap and by key, the reduced-motion variant, and what a
  screen reader is given on each side.

## Out of scope

- The detail dialog that holds a big card. The collection task adds it.
- A link to the Commons page. The credits page has it.
