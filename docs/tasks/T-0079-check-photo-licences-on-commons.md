---
id: T-0079
title: Check a player photo's licence and credit on Wikimedia Commons
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/commons.py
  - data/pipeline/tests/test_commons.py
  - data/pipeline/tests/fixtures/commons/**
dependencies: []
max_changed_lines: 400
status: ready
---

## Goal

For a player's Commons image, the pipeline decides publish or avatar and
records the credit, exactly as ADR 0003 D2 and D3 require.

## Context

- ADR 0003 D2 to D4, ADR 0006 D1, the `game-data-api` skill section
  "Photos", `packages/schema` `$defs/attribution` (the SPDX allow list).
- T-0072's `http.py` for every request. Read the Commons API page for
  `prop=imageinfo&iiprop=extmetadata|url|size` first.

## Acceptance criteria

- `commons.py` reads one file's metadata and returns either a publish
  decision with the file page, author (plain text, markup removed), SPDX
  licence code and the image URL, or an avatar decision with the reason.
- Only CC0, public domain and CC BY / CC BY-SA (any version on the SPDX
  list) publish. Anything else, or any missing field, gives the avatar.
- The author text matches the schema's attribution pattern, or the photo
  gets the avatar.
- `make check COMPONENT=data` passes. No test reaches the network.

## Edge cases

- A licence named in an unexpected way (for example "CC BY-SA 4.0" vs
  "cc-by-sa-4.0") maps to the right SPDX code or to the avatar, never to a
  wrong code.
- An author field holding HTML, a link, or control characters.

## Tests

- Saved replies for a CC BY-SA file, a public-domain file and a non-free
  file; a test that a licence off the allow list gives the avatar; a test
  that an incomplete record gives the avatar.

## Out of scope

- Downloading and resizing (T-0080).
