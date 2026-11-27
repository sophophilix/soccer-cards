---
id: T-0192
title: Run three browsers only for layout and input tests
component: web
kind: chore
agent: web-implementer
paths:
  - apps/web/playwright.config.ts
  - apps/web/tests/**/*.spec.ts
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

Every end-to-end test runs in Pixel 7 Chromium, iPhone 15 WebKit and
desktop Chromium. Only layout, touch, fonts and tap targets differ by
engine (ADR 0011 D2). Run the rest in `phone-chromium` only.

It starts after T-0191.

## Context

- Playwright tags: <https://playwright.dev/docs/test-annotations#tag-tests>
- ADR 0011 D2, ADR 0012 D1.

## Acceptance criteria

- `phone-chromium` runs every spec. `phone-webkit` and `desktop-chromium`
  run only tests tagged `@engines`.
- `@engines` goes on tests that check a width, sideways scroll, a size in
  pixels, touch input, fonts or tap targets, and on nothing else.
- The report lists each tagged test, and the test count per project before
  and after.

## Edge cases

- An accessibility scan, header check, journey or saved-state test is not
  tagged, even when it sets a viewport.

## Tests

- end-to-end: the existing specs, with tags added and no other change.
  All pass in `make check COMPONENT=web` and in CI.

## Out of scope

- Any change to a test's body, and any test removal.
