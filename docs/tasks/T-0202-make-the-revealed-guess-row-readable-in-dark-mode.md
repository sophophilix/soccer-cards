---
id: T-0202
title: Make the revealed club's facts readable in dark mode in Guess the Club
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/src/routes/games/guess-the-club/GuessBoard.svelte
  - apps/web/tests/guess-the-club.spec.ts
dependencies: []
max_changed_lines: 100
status: done
---

## Goal

T-0197's new accessibility scan found a contrast failure. After an answer
in Guess the Club, the revealed club's row is highlighted. In dark mode,
its facts line ("2004 to 2008, 100 games, goals not known") is `--muted`
(`#93aea2`) on the highlight (`#1b4731`). That is a ratio of 4.42, and
WCAG AA needs 4.5 for 14px text. Light mode passes.

## Context

- `apps/web/src/routes/games/guess-the-club/GuessBoard.svelte`: the
  `.spells .hit` rule and the `<small class="muted text-sm">` facts line.
- `apps/web/src/app.css`: the `--muted`, `--surface` and `--ctrl` tokens
  for each theme.
- `apps/web/tests/a11y/home.spec.ts`: how the site runs an axe scan and
  checks for incomplete colour-contrast results.

## Acceptance criteria

- In both themes, every piece of text in the revealed row meets 4.5:1
  against its background.
- The row stays visibly highlighted, as the prototype's `.hit` style does.
- The fix stays inside `GuessBoard.svelte`. Don't change the theme tokens
  in `app.css`, because other pages rely on them.

## Edge cases

- Revealed after a right answer and after a wrong answer.
- The system set to dark mode, and the site's own theme switch set to
  dark.

## Tests

- e2e: `guess-the-club.spec.ts`: with the colour scheme set to dark,
  answer one question, then run an axe scan of the board. It reports no
  colour-contrast violation and no incomplete colour-contrast result.
  Check that the test fails before the fix.

## Out of scope

- The prototype has the same colours. Correcting it is a separate docs
  task.
- T-0197's full scan of every game, which lands after this fix.
