---
id: T-0160
title: Add a Games tab with a menu of games
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/ui/TabBar.svelte
  - apps/web/src/lib/ui/TabBar.svelte.test.ts
  - apps/web/src/routes/games/+page.svelte
  - apps/web/src/routes/games/GamesMenu.svelte
  - apps/web/src/routes/games/GamesMenu.svelte.test.ts
  - apps/web/tests/games.spec.ts
  - apps/web/tests/views.spec.ts
  - apps/web/tests/privacy/journeys.spec.ts
  - apps/web/tests/a11y/home.spec.ts
dependencies: []
max_changed_lines: 300
status: done
---

## Goal

The site gets a Games tab, as in the prototype the kids played. The tech
lead chose this on 2026-11-23 ("Add a Games tab now"): Games moves inside
Play when the ADR 0010 D7 tabs are drawn and built. The menu lists
Transfer Trail, the first game to come to the site.

## Context

- `prototype/soccer-cards-prototype.html`: the tab bar and the Games menu
  (`#games-menu`, `.gamelist`, `.gamebtn`) are the approved look.
- `apps/web/src/lib/ui/TabBar.svelte` and its comment on fitting 320 pixels.
- `sveltekit-web`: routes are prerendered, and each view has its own
  address.
- `child-safety-privacy`.

## Acceptance criteria

- The tab bar reads Packs, Match, Games, Cards, Guide, and Games links to
  `/games`.
- At window widths of 320, 360 and 390 pixels the five tabs fit with no
  sideways scroll, including "Cards (N)", and every tab keeps a 44 pixel
  tap target.
- `/games` shows a heading, the line "Pick a game. You win coins for
  playing. Nothing is ever taken away." and one game button: Transfer
  Trail, "Put a player's clubs in the order they joined them.", linking to
  `/games/transfer-trail`.
- The page passes the site's accessibility scan and its privacy checks (no
  request to another host, no cookie).

## Edge cases

- `/games/` with a trailing slash marks the Games tab as current.
- Until T-0161 merges, `/games/transfer-trail` is the site's not-found page.
  The end-to-end test checks only the link's address.

## Tests

- `TabBar.svelte.test.ts`: the five tabs, their order and the current tab on
  `/games`.
- `GamesMenu.svelte.test.ts`: the text and the link.
- `tests/games.spec.ts`: open Games from the tab bar and check the widths at
  320, 360 and 390 pixels.
- Add `/games` to the page lists in `views.spec.ts`,
  `privacy/journeys.spec.ts` and `a11y/home.spec.ts`.

## Out of scope

- The Transfer Trail screen (T-0161), Pairs, Connections and Guess the Club.
- The ADR 0010 D7 tabs (Shop, Play, Me).
