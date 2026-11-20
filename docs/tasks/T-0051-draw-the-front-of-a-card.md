---
id: T-0051
title: Draw the front of a card
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

The card the kids approved exists as one component that every screen can
use at any size, from a grid thumbnail to full width.

## Context

- `prototype/soccer-cards-prototype.html`: `cardHTML`, the `.card` and
  `.front` styles, the four tier looks (`t-base`, `t-rare`, `t-legend`,
  `t-icon`), the radiant ground, the rating badge, the three play stats
  and the kit avatar used when a card has no photo.
- The `sveltekit-web` skill, "Components", "Animation" and
  "Accessibility". ADR 0003 D1: no crest, no logo, flags drawn by the
  project.
- Runs after T-0048.
- The component takes plain props. It does not load data or read state.
  Tests use invented players.
- Aim for about 300 changed lines. The limit is 380. The first build came
  to 471 lines with four tier looks, so the rare, legend and icon looks
  moved to T-0061. Prettier puts each CSS declaration on its own line.

## Acceptance criteria

- `CardFront` takes: display name, position, national team code, club
  name, shirt number, tier, card title, overall, the three play stats and
  an optional photo (address, width, height).
- It sizes everything from its own width with container units, and looks
  right at 96, 180 and 360 pixels wide.
- The base tier has its look from the prototype. A card of any of the four
  tiers writes its tier in words, so colour is never the only signal. Until
  T-0061, the other three tiers show the base look with their own word.
- With no photo, the kit avatar shows.
- A photo has its `width` and `height` set, `loading="lazy"`, and an
  empty `alt`, because the card's own label names the player.
- The card has one accessible name that states the player, the position,
  the tier, the overall and the three play stats.
- No `{@html}`. Text from data is rendered as text.
- `make check COMPONENT=web` passes.

## Edge cases

- A very long name and a one-word name such as "Pelé".
- A club name of 30 characters.
- Dark theme: the card keeps its own paper and ink, as in the prototype.

## Tests

- Component tests in `apps/web/src/lib/cards/` with
  `vitest-browser-svelte`: the accessible name, the avatar fallback, each
  tier's word, the photo attributes, and that markup in a name shows as
  text.
- An end-to-end page under `apps/web/tests/` is not needed yet: no route
  shows a card. Say so in the report.

## Out of scope

- The rare, legend and icon looks. T-0061 adds them.
- The back of the card and the flip. T-0052 adds them.
- Loading players. A later task maps the API to these props.
