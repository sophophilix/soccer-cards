---
id: T-0080
title: Download a published photo and re-encode it as a small WebP
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/photos.py
  - data/pipeline/tests/test_photos.py
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
dependencies:
  - pillow
max_changed_lines: 260
status: ready
---

## Goal

A photo that T-0079 publishes is fetched once, resized and re-encoded to
WebP, with no crop or edit (ADR 0003 D3).

## Context

- ADR 0003 D3, the `game-data-api` skill section "Photos", T-0072's
  `http.py` (binary download needs a method of its own there if it lacks
  one; say so instead of widening this task).

## Acceptance criteria

- `photos.py` resizes to a fixed maximum width, keeps the aspect ratio,
  strips metadata, and writes `photos/{slug}.webp`, returning its width
  and height. Same input gives the same bytes.
- Pillow is added with `uv add` and named in `no-build-package` with any
  new transitive package.
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- An image smaller than the maximum width is not enlarged.
- A file that isn't an image fails with an error naming the slug.

## Tests

- Generated test images (made in the test, not real photos): resize,
  no enlarge, metadata stripped, deterministic bytes, bad input.

## Out of scope

- Choosing which photo (T-0079 decides).
