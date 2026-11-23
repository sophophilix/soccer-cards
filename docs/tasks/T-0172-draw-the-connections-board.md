---
id: T-0172
title: Draw the Connections board for one question
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/routes/games/connections/ConnectionsBoard.svelte
  - apps/web/src/routes/games/connections/ConnectionsBoard.svelte.test.ts
  - apps/web/src/routes/games/connections/connections-words.ts
  - apps/web/src/routes/games/connections/connections-words.test.ts
dependencies: []
max_changed_lines: 330
status: ready
---

## Goal

The third Connections task (see T-0170). The board shows one question: two
players' card faces, four club buttons, and after an answer the result and
both players' years at the right club. It holds no rule and pays nothing.
It can run alongside T-0170 and T-0171, because it only takes plain props.

## Context

- `prototype/soccer-cards-prototype.html`, Connections (`#games-connect`,
  `renderConnect`, `cnAnswer`) is the approved look and behaviour.
- `apps/web/src/routes/games/transfer-trail/TrailBoard.svelte` after T-0167
  and T-0168: follow its patterns for card faces in `data-art`, level-2
  headings, the result in words, and Next ignoring activation for a moment
  after an answer, shown with `aria-disabled`.
- `sveltekit-web`, `child-safety-privacy`, `ts-testing`.

## Acceptance criteria

- The board takes the two card faces and player names, the four options
  (club id and display name), and, after an answer, the picked club, the
  right club and each player's years there.
- Two card faces side by side, stacked on a phone, and four club buttons
  in two columns, one column on a phone.
- A tap on a club tells the page the pick. After the result arrives, a
  right answer says "Right! Both played for X." A wrong one marks the right
  club and the picked one in words ("right", "not this one") as well as
  colour. Both show each player's years at the right club.
- "Next" (or "Finish round" on the last question) ignores activation for a
  moment after the answer, shown with `aria-disabled`, then tells the page
  to carry on.
- `connections-words.ts` holds the board's words. A club name that ends in
  a full stop ("Chelsea F.C.") doesn't get a second one.
- Every club button's accessible name is the club's name. Works with a
  keyboard alone. Nothing animates.

## Edge cases

- A double tap on a club answers once.
- A held Enter or a double tap on a club can't press Next.
- Long club names wrap at 320 pixels.

## Tests

- `ConnectionsBoard.svelte.test.ts`: a pick, a right and a wrong result in
  words, the years, Next waiting then working (fake timers), a double tap
  and a repeated Enter on a club, Finish round on the last question.
- `connections-words.test.ts`: each piece of wording, including a name
  ending in "F.C.".

## Out of scope

- The rules (T-0170, T-0171), loading careers and the page (T-0173).
