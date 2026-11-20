---
id: T-0090
title: Make photo processing robust and keep colours true
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/photos.py
  - data/pipeline/tests/test_photos.py
dependencies: []
max_changed_lines: 160
status: ready
---

## Goal

Close T-0080's review findings: every bad image fails with `PhotoError`,
an image too large for WebP is refused, and colours are converted to sRGB
before the profile is dropped (ADR 0003 D3).

## Acceptance criteria

- A malformed PNG header (`ValueError`, `SyntaxError`) raises `PhotoError`
  naming the slug.
- An image that would exceed WebP's 16383 px limit after resizing is
  refused with `PhotoError`.
- A photo with a non-sRGB ICC profile (Adobe RGB, Display P3, CMYK) is
  converted to sRGB with `PIL.ImageCms` before the profile is dropped.
- `make check COMPONENT=data` passes.

## Tests

- One generated image per case.

## Out of scope

- Downloading (T-0088).
