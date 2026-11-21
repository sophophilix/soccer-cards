---
id: T-0124
title: Review the web work built while the process was paused
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/**
  - docs/design/**
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

From 2026-11-21 to 2026-11-22 the tech lead paused the task process to bring the
site up to the prototype. Three pull requests were built and merged or opened
without agent reviews: #209 (Tailwind CSS, GSAP, brand kit, ADR 0007), #210
(card back) and #211 (goal scene and celebrations). The tech lead asked for a
security review before more work ("yes start the security review and resume
the process"). This task is that review. It changes no code: each finding
becomes its own fix task.

## Context

- The range to review is from `23cbd12` (the last commit before the pause) to
  the head of `feat/match-animations`, which holds #209, #210 and #211.
- ADR 0002 (hosting, headers), ADR 0003 (privacy, the page's own origin only),
  ADR 0007 (Tailwind, GSAP and the brand kit), the `child-safety-privacy`,
  `sveltekit-web`, `ts-standards` and `ci-supply-chain` skills.
- Points the lead wants covered:
  - the two new packages, `tailwindcss` with `@tailwindcss/vite` 4.3.5 and
    `gsap` 3.15.1: licence, install scripts, size, and whether either makes a
    request off the site
  - GSAP and the attachments writing styles through the CSS object model under
    the content security policy, which refuses style attributes
  - the card back fetching `/api/v1/players/<id>.json`: the id in the path,
    and how the body is read
  - the `soccer-cards:saved` window event carrying the player state
  - the axe scans that now exclude `[data-art]`: is anything a child needs
    hidden from the checks
  - reduced motion: does every new animation stop
  - anything that reads or writes storage outside `lib/state`

## Acceptance criteria

- A security review file and a code review file in `.sdlc/reviews/` for T-0124,
  each accepted by `bin/sdlc review-check`.
- Every finding names its file, line and a fix small enough for one task.

## Edge cases

- A finding that needs the tech lead (a risk to accept, a header policy) says so.

## Tests

- None. This task reviews and changes nothing.

## Out of scope

- Fixing what the review finds. The lead writes a brief for each finding.
- The HSTS header, which waits for the tech lead's choice of policy.
