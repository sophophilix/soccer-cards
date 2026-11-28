---
id: T-0208
title: Limit how many cards from one country a pack holds
component: game
kind: feature
agent: web-implementer
paths:
  - packages/game/src/cards.ts
  - packages/game/src/cards.test.ts
  - packages/game/src/draw-pack.ts
  - packages/game/src/draw-pack.test.ts
  - packages/game/src/draw-pack.property.test.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

On 2026-11-28 the tech lead chose a pack rule: a standard pack never holds
more than 3 cards from one national team, and a jumbo pack scales that
limit to 15 of 50. Today 19 of the 64 players are Australian, so packs are
often mostly Australian.

## Context

- `docs/product/feature-list.md`, P1.
- `packages/game/src/draw-pack.ts`: `drawPack` deals base cards, then rolls
  each lucky card's tier on `LUCKY_ODDS`.
- `packages/game/src/cards.ts`: `Card` and `checkCardSet`.
- The published data gives each player an optional `nationalTeamCode`,
  such as `AUS`. T-0209 passes it into the card set on the site.

## Acceptance criteria

- `Card` gains an optional `nationalTeam` (a three-letter code).
  `checkCardSet` accepts a card without one and refuses one that isn't
  three capital letters, with the existing `invalid-card-field` reason.
- A named constant holds the limit per kind of pack: 3 for standard and 15
  for jumbo.
- A drawn pack holds at most the limit of cards with any one
  `nationalTeam`, base and lucky cards together.
- A card with no `nationalTeam` never counts towards a limit.
- Each lucky card's tier is still rolled on `LUCKY_ODDS` exactly as now.
  The limit only changes which card of that tier is picked, never the tier.
- When the set can't fill a pack inside the limit, `drawPack` still
  returns a full pack: it fills the rest from the cards the limit left out.
  It never fails for this reason.
- Same seed, same pack, as now.

## Edge cases

- A card set where every card has one national team.
- A card set where no card has a national team: packs are drawn exactly as
  before for the same seed.
- A tier whose only cards come from a nation that has reached its limit.
- A set smaller than a pack, where base cards repeat.

## Tests

- unit: `draw-pack.test.ts`: a set with 30 cards from one nation and 30
  from others gives a standard pack with at most 3 from that nation. A set
  with only one nation still gives a full pack.
- property: `draw-pack.property.test.ts`: for random sets with enough
  nations, no nation exceeds the limit, and the lucky tiers match the tiers
  drawn without a limit for the same seed.
- unit: `cards.test.ts`: `checkCardSet` accepts a missing `nationalTeam`
  and refuses `au` or `AUST`.

## Out of scope

- The site's card loading (T-0209), the odds text, team packs and prices.
