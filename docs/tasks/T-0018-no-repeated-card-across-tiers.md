---
id: T-0018
title: Stop a pack repeating a card that the card set lists under two tiers
component: game
kind: fix
agent: web-implementer
paths:
  - packages/game/src/packs.ts
  - packages/game/src/packs.test.ts
dependencies: []
max_changed_lines: 100
status: ready
---

## Goal

A pack never shows the same card twice. Today a card set that lists one id
under two tiers can give a pack with that card in both.

## Context

- Review finding T-0003 reviewer F1.
- `openPack` in `packages/game/src/packs.ts` removes repeats inside each
  tier only.
- Aim for about 50 changed lines. The limit is 100.

## Acceptance criteria

- When a card set lists one id more than once, the first listing counts
  and the later ones are ignored, whatever their tier.
- The size check for each tier counts the cards left after that.
- A refusal still uses no random numbers.
- `make check COMPONENT=game` passes.

## Edge cases

- A set of 7 base, 1 rare and 1 legend, plus a second `base-1` marked
  rare, refuses a standard pack with `not-enough-cards` for `rare`.
- A set with no repeated id gives the same pack as before for the same
  seed.

## Tests

- Unit tests in `packs.test.ts`, written first and seen to fail.

## Out of scope

- Pack sizes, the mix and prices. Those change after the tech lead
  confirms the new rules.
- `state.ts` and `trade.ts`.
