---
id: T-0093
title: Show the Packs screen and reveal a pack's cards
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/packs/**
  - apps/web/src/routes/+page.svelte
  - apps/web/tests/packs.spec.ts
  - apps/web/tests/home.spec.ts
  - apps/web/tests/fonts.spec.ts
  - apps/web/tests/privacy/requests.spec.ts
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

The Packs screen shows the packs, opens one with T-0086's logic, and
reveals the cards one at a time with FlipCard, best last.

## Context

- The prototype's Packs view, T-0086 `lib/packs`, T-0094's display fields and T-0096's card number and title,
  `lib/cards/FlipCard`, the `sveltekit-web` and `child-safety-privacy`
  skills. The first build was 600 lines: the card props are T-0107 (merge
  first), and the reload, double-tap, storage and axe tests are T-0108.

## Acceptance criteria

- Pack kinds with their price or free label; opening reveals cards with
  FlipCard (front and back with real fields), best last; reduced motion
  shows them without animation; a reload keeps them.
- The view keeps the newest state returned by T-0086's functions and
  disables the Open and Add buttons while a step runs, so a double tap or
  an old state can't open a second pack (T-0086 review).
- A loading or data error shows a plain message and a retry.
- The existing home, fonts and privacy tests are updated for the real
  Packs view and pass with the published data.
- `make check COMPONENT=web` passes, including axe on the screen.

## Edge cases

- Storage unavailable: the pack opens and the screen says progress can't
  be saved on this device.

## Tests

- `packs.spec.ts` end to end: prices, open, reveal with the best last,
  flip, reduced motion, error and retry. The rest is T-0108.

## Out of scope

- The prototype's pack art and tear animation (a later polish task).
