---
id: T-0144
title: Use Wikidata's multilingual label when a player has no English label
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/fixtures/wikidata/**
dependencies: []
max_changed_lines: 150
status: done
---

## Goal

T-0140 couldn't add Sergio Ramos (Q483309): the build failed with "label
is missing or not plain text". Wikidata now often keeps a person's name as a
multilingual label (language code `mul`) and leaves the English label
empty. At the scale of ADR 0008 D6 this will block many players.

## Context

- `_PARAMS` asks for `languages: "en"`, and `_label` reads only `en`, in
  `wikidata.py`.
- Wikidata's help page on the `mul` language code, "Help:Default values for
  labels and aliases". Read it and record the address and the time you read
  it in a comment.
- `names.py` checks that a label is plain text. That check stays.

## Acceptance criteria

- The request asks for `en` and `mul` labels.
- `_label` returns the English label when there is one, and otherwise the
  `mul` label.
- A label from `mul` passes the same plain-text check as an English one.
- Team labels follow the same rule.
- `make check COMPONENT=data` passes, with no test reaching the network.

## Edge cases

- Both labels present and different: English wins.
- Neither present: the same failure as today.
- A `mul` label in a script other than Latin: the plain-text check decides,
  as for English.

## Tests

- `test_wikidata.py` with fixtures: English only, `mul` only, both, and
  neither.

## Out of scope

- Re-running the pipeline and adding the players, positions and national
  teams (T-0143).
