---
id: T-0201
title: Line up the Games menu text on the left, as the prototype does
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/games/GamesMenu.svelte
  - apps/web/tests/games.spec.ts
dependencies: []
max_changed_lines: 80
status: done
---

## Goal

The tech lead reported that the four buttons on the Games menu don't line
up. Each game's name and blurb sit at a different distance from the left
edge, because each block is centred inside its button. In the prototype,
every name and blurb starts at the same left edge, 16px in from the
border.

## Context

- `apps/web/src/app.css`, the `a, button` rule: it gives every link
  `justify-content: center`, so that a small link centres its text in its
  tap target.
- `apps/web/src/routes/games/GamesMenu.svelte`, `.gamebtn`: it sets
  `display: grid`, but the inherited `justify-content: center` still
  applies. That shrinks the grid column to the widest line and centres it,
  so each button gets a different indent.
- `prototype/soccer-cards-prototype.html`, `.gamebtn`: it uses
  `all: unset` on a `<button>`, so nothing is centred.
- Component tests don't load `app.css`, so only an end-to-end test sees
  this bug.

## Acceptance criteria

- On `/games`, in the phone and desktop layouts, every game name and every
  blurb starts at the same left edge, 16px inside its button's border.
- The buttons look the same as before in every other way: border, radius,
  shadow, padding, fonts, gap and order.
- Other links and buttons on the site are unchanged. Don't edit
  `app.css`.

## Edge cases

- A blurb that wraps onto two lines still starts at the left edge.
- The fix holds in the dark theme and with reduced motion.

## Tests

- e2e: `games.spec.ts`: on `/games`, the left edge of each game's name is
  the same for all four buttons, within 1px, and equals its button's left
  edge plus the border and padding. Each blurb's left edge also equals its
  name's left edge. Check that the test fails before the fix.

## Out of scope

- The blurb wording (the prototype's Pairs blurb differs; that is a
  separate parity item).
- Other pages that may style a link as a block. Report any you notice to
  the lead.
