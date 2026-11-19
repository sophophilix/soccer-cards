---
id: T-0048
title: Serve the prototype's fonts and design tokens from the site
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/app.css
  - apps/web/src/lib/ui/**
  - apps/web/package.json
  - knip.json
  - apps/web/static/_headers
  - apps/web/tests/**
  - pnpm-lock.yaml
  - THIRD_PARTY.md
dependencies:
  - '@fontsource/bowlby-one'
  - '@fontsource/saira-condensed'
  - '@fontsource-variable/figtree'
max_changed_lines: 300
status: done
---

## Goal

Every later screen takes its colours, sizes and fonts from one place, and
the three fonts of the approved prototype load from the site's own domain.

## Context

- `prototype/soccer-cards-prototype.html`: the `:root` tokens, both colour
  themes, and the three font stacks (Bowlby One, Saira Condensed,
  Figtree). The prototype loads them from Google; the site must not
  (ADR 0003 D5 and D6).
- The `sveltekit-web` skill, "Components" and "Performance". The
  `child-safety-privacy` skill.
- The three fonts are under the SIL Open Font License. The Fontsource
  packages ship the files. Check each package's licence and latest release
  on the registry before adding it, and that it is older than
  `minimumReleaseAge`. If a name above is wrong, stop and tell the lead.
- `THIRD_PARTY.md` lists what the site ships that others made.
- Knip sees the font packages as unused, because only a stylesheet names
  them. `knip.json` tells it to ignore the two Fontsource scopes for the
  `apps/web` workspace. The first run of this task stopped there. Don't
  add a script import of a font package to quiet Knip.
- The lockfile is written by pnpm and is not counted by the kit.
- Aim for about 180 changed lines without the lockfile. The limit is 300.

## Acceptance criteria

- `app.css` defines every colour, font and spacing token the prototype's
  `:root` has, for the light and the dark theme, chosen by
  `prefers-color-scheme`.
- The three fonts are served from the site's own origin as WOFF2, with
  `font-display: swap`, in only the weights and the Latin subsets the
  prototype uses.
- The home page uses the tokens: body text in Figtree, the heading in
  Bowlby One.
- The existing privacy test still passes: no request leaves the origin,
  and the Content Security Policy still allows fonts from `'self'` only.
- `THIRD_PARTY.md` names each font, its author, its licence and its
  package.
- Text contrast meets WCAG AA in both themes; the accessibility test
  covers the home page in each.
- `make check COMPONENT=web` passes.

## Edge cases

- A browser with reduced data or no font support. The fallback stack
  shows, and nothing shifts enough to fail a layout test.
- A player whose system is in dark mode.

## Tests

- `apps/web/tests/`: an end-to-end test that every font request is to the
  origin and answers 200, and that the heading's computed font is Bowlby
  One once fonts are ready; the axe test in both colour schemes.

## Out of scope

- Any screen beyond the home page.
- A theme switch in the page. The system setting chooses.
