---
id: T-0130
title: List GSAP, Tailwind and the design plugin in THIRD_PARTY.md
component: docs
kind: docs
agent: web-implementer
paths:
  - THIRD_PARTY.md
dependencies: []
max_changed_lines: 100
status: ready
---

## Goal

`gsap`, `tailwindcss` and `@tailwindcss/vite` reached main with no row in `THIRD_PARTY.md`, and GSAP's licence is its own no-charge licence, not an open-source one (T-0124 reviewer F7, security F1). The `frontend-design` plugin skill the web implementer now loads isn't listed either (reviewer F12).

## Context

- The T-0124 review files: `.sdlc/reviews/T-0124.reviewer.json` and `.sdlc/reviews/T-0124.security-reviewer.json` in the main checkout.
- ADR 0007 D3.

## Acceptance criteria

- A JavaScript packages table: name, version, licence, a link to the licence terms, and the UTC date the terms were read.
- A row for the `frontend-design` Claude Code plugin skill: source, licence as published, date read.

## Edge cases

- A licence that only links to its terms says so.

## Tests

- None. A document change.

## Out of scope

- Changing any package.
