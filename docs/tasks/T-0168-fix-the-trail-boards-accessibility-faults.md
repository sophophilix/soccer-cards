---
id: T-0168
title: Fix the Transfer Trail board's heading order and card art marking
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/games/transfer-trail/TrailBoard.svelte
  - apps/web/src/routes/games/transfer-trail/TrailBoard.svelte.test.ts
  - apps/web/tests/a11y/home.spec.ts
dependencies: []
max_changed_lines: 150
status: done
---

## Goal

T-0166's browser tests found two accessibility faults on
`/games/transfer-trail` and let them through with narrow exceptions in
`apps/web/tests/a11y/home.spec.ts` (`KNOWN_FAULTS`). This fix removes both
faults and both exceptions, and makes Next's short pause after a check
visible.

## Context

- `TrailBoard.svelte` (T-0161, T-0167).
- The other card views wrap card art in `data-art` (for example
  `apps/web/src/lib/cards/CardSlot.svelte`), which the accessibility scan
  relies on to skip text drawn over card art.
- T-0167 made "Next player" ignore activation for 700 ms after a check. A
  child who taps in that moment gets no feedback (T-0166 report).

## Acceptance criteria

- The board's headings ("Clubs to place", "Trail, first club to last") are
  `<h2>`, so headings go h1 then h2 with no level skipped.
- The board's card face is wrapped in `data-art`, as on the other card
  views.
- `home.spec.ts` no longer disables `heading-order` or excludes `.face` for
  `/games/transfer-trail`, and the scan passes in light and dark.
- During the 700 ms pause, Next shows it isn't ready yet (for example
  `aria-disabled="true"` and the site's disabled look), and is ready after
  it. It stays focusable, so focus doesn't jump.

## Edge cases

- The heading change keeps the board's look the same.
- Reduced motion: the ready change has no animation.

## Tests

- `TrailBoard.svelte.test.ts`: the two headings are level 2; Next has
  `aria-disabled="true"` during the pause and not after.
- `home.spec.ts`: the exceptions are removed and the scan passes.

## Out of scope

- The Games tab marking (T-0169) and any other page.
