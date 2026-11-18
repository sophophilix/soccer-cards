---
id: T-0042
title: Remove the old fixed-mix pack rule
component: game
kind: chore
agent: web-implementer
paths:
  - packages/game/src/packs.ts
  - packages/game/src/packs.test.ts
  - packages/game/src/cards.test.ts
  - packages/game/src/draw-pack.ts
  - packages/game/src/state.ts
  - packages/game/src/trade.ts
  - packages/game/src/index.ts
dependencies: []
max_changed_lines: 380
status: ready
---

## Goal

The game package holds one pack rule. The old one, a fixed count per tier,
is deleted now that nothing uses it.

## Context

- Runs after T-0041.
- `packages/game/src/packs.ts`: `openPack`, `packMix`, the two mixes, the
  two size constants and the `PackMix` and `OpenPackResult` types. Only
  its own tests use them after T-0041.
- `PackKind` is still needed. It moves to `draw-pack.ts`.
- This is almost all deletion: `packs.test.ts` is 247 lines and `packs.ts`
  70. That is why the limit is 380. Nothing new is written.

## Acceptance criteria

- `packs.ts` and `packs.test.ts` are deleted.
- `PackKind` lives in `draw-pack.ts`, and every import of it points there.
- `index.ts` no longer exports `openPack`, `packMix`, the mixes, the old
  size constants, `PackMix` or `OpenPackResult`. It still exports
  `PackKind`.
- `packs.test.ts` also holds the only test that `toCardId` refuses an
  empty or blank id. That test moves to `cards.test.ts`, unchanged in
  meaning, so the refusal stays covered.
- No behaviour changes: every other remaining test passes with no edit.
- Knip reports no unused export in `packages/game`.
- `make check COMPONENT=game` passes, with coverage still over its
  thresholds.

## Edge cases

- A remaining file imports something else from `packs.ts`. If moving it
  needs a file outside this brief's paths, stop and tell the lead.

## Tests

- No new test. The gate proves the package still builds, lints and passes.

## Out of scope

- Any change to `drawPack` beyond holding the `PackKind` type.
- The skills that still describe the old pack. They are kit files.
