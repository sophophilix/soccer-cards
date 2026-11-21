---
id: T-0109
title: Map Wikidata's specific positions to the four card positions
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/tests/test_normalise.py
  - data/pipeline/tests/test_build.py
dependencies: []
max_changed_lines: 200
status: ready
---

## Goal

T-0084's third live run stopped on `Q16056053: no Wikidata position fits
the grades`. Seven of the 24 players list only specific positions (P413),
such as winger or centre-back, which the map of four doesn't hold.

## Context

The lead scanned the cached replies and looked up the items:

| Item | Label | Card position |
|---|---|---|
| Q11681748 | winger | forward |
| Q90326494 | attacking midfielder | midfielder |
| Q18691898 | defensive midfielder | midfielder |
| Q6008848 | central midfielder | midfielder |
| Q8025128 | wing half | midfielder |
| Q1109563 | centerhalf | midfielder |
| Q268258 | centre-back | defender |
| Q90173132 | full-back | defender |
| Q1489923 | sweeper | defender |

Affected: Grealish and Saka (forward), Rice and Modrić and Pedri
(midfielder), Dias and Maldini (defender).

## Acceptance criteria

- If a player lists any of the four basic positions, the first of those
  wins, as now. Only if none is listed does the first specific one, mapped
  as above, decide. So Ronaldo (wing half, then forward) stays a forward.
- Every player's position is checked before any download, and every player
  with no usable position is named in one error, like the team codes.
- `make check COMPONENT=data` passes. No test reaches the network.

## Tests

- A specific-only player for each card position; a basic position beating
  an earlier specific one; two failing players named at once.

## Out of scope

- Following P279 at run time.
