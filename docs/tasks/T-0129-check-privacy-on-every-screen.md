---
id: T-0129
title: Check requests, cookies and the policy on every screen
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/tests/privacy/**
dependencies: []
max_changed_lines: 250
status: ready
---

## Goal

The checks for requests to other hosts, cookies and policy violations visit only the home and not-found pages (T-0124 reviewer F6, security F4). The pack tear, the card flip and tilt, the goal scene and the card back's fetch run elsewhere.

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- `apps/web/tests/privacy/requests.spec.ts`.

## Acceptance criteria

- A journey through every view: tear a pack and add it, open and flip a card on Cards, play a match through to the scene and the result, open the Guide.
- Throughout: every request goes to the site's own origin, no cookie is set, and no console message reports a content security policy violation.
- `make check COMPONENT=web` passes.

## Edge cases

- None beyond the criteria. Tests only.

## Tests

- `tests/privacy/journeys.spec.ts`.

## Out of scope

- Changing the policy or the headers.
