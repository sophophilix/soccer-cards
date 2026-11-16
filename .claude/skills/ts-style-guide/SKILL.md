---
name: ts-style-guide
description: "Guides TypeScript authoring and refactoring in this repository: naming, module design, types, errors, state and edge cases. Use when writing or changing TypeScript or the script part of a Svelte file. Requires ts-standards."
metadata:
  version: "1.0.0"
---

# TypeScript style guide

Read `ts-standards` first. Prettier owns layout and ESLint owns what it can
check, so this skill covers what a tool can't decide. Match the code around
you before applying a preference of your own.

## Names

| Thing | Form | Example |
|---|---|---|
| File or folder | kebab-case | `open-pack.ts`, `open-pack.test.ts` |
| Svelte component | PascalCase | `PlayerCard.svelte` |
| Type or interface | PascalCase, no `I` prefix | `Pack`, `BattleResult` |
| Function | camelCase, starts with a verb | `openPack`, `scoreTeam` |
| Boolean | `is`, `has`, `can` or `should` | `isFavourite`, `canBattle` |
| True constant | UPPER_SNAKE_CASE | `TEAM_SIZE`, `PACK_COST_COINS` |
| Identifier type | Branded | `PlayerId`, `CardId` |

- Use the game's own words, as the prototype and the children use them:
  pack, jumbo pack, card, collection, trade, favourite, battle, coins, tier.
  Use one word for one thing.
- Put the unit in the name when a number has one: `durationMs`, `widthPx`.
- No abbreviations a child's parent wouldn't know. `stats` is fine. `cfg` is
  not.
- A number with a meaning gets a named constant. `7` in a pack rule is
  `BASE_CARDS_PER_PACK`.

## Modules

- One purpose per module. If the name needs "and", split it.
- Named exports only. Use a default export where SvelteKit requires one.
- No barrel files, except the single `index.ts` that is a package's public
  entry. Everything else in a package is private to it.
- No circular imports.
- Keep the core pure. A rule in `packages/game` takes data in and returns
  data out. Reading storage, the clock, randomness or the network happens at
  the edge, in the app, and is passed in.
- No module-level mutable state. No work at import time.
- Import with file extensions and the `#lib` alias, as SvelteKit 3 requires.

## Types

- No `any`. Data from outside is `unknown` until a schema check narrows it.
- Model a choice as a discriminated union, not as optional fields or
  booleans. A pack is `{ kind: 'standard' } | { kind: 'jumbo' }`.
- Make an invalid state impossible to write down. A team is a tuple of 11
  card ids, not an array someone must count.
- Use string literal unions or `as const` objects. Don't use `enum`.
- Mark inputs `readonly`. Never mutate an argument. Return a new value.
- Every `switch` over a union ends with a `never` check.
- Exported functions declare their return type.
- No non-null `!`. No `as` cast, except straight after a schema check, in the
  module that does the check.
- Prefer `satisfies` to a cast when checking a literal against a type.

## Functions

- A function does one thing at one level of detail.
- Three parameters at most. Past that, take one options object.
- No boolean parameters. Two named functions, or a union, read better.
- Return early for the unusual case. Keep the main path unindented.
- Don't write a helper until the second use. Don't add an option nobody
  needs yet.

## Errors

- An outcome a player can cause is a value, not an exception. Return
  `{ ok: true, value }` or `{ ok: false, reason }` with a literal union for
  `reason`, such as `'not-enough-coins'`.
- `throw` only for a programmer error that a test should catch.
- Never catch and ignore. Handle it, return it or let it rise.
- The app turns a `reason` into words for a child at the edge. Rules never
  hold display text.
- Saved state that fails validation is replaced by a fresh start, and the
  old value is kept under a backup key so nothing is destroyed silently.

## Edge cases to consider on every change

Check each one that the change can reach, and write the test.

- An empty collection. Exactly 10 and exactly 11 different players.
- Doubles: counts of 1, 2 and many. Trading the last copy. Trading a
  favourite.
- 0 coins, exactly the price, one coin short.
- A tier with too few cards left to fill a pack or to trade for.
- Saved state that is missing, corrupt, from an older version, or from a
  newer version.
- Storage that is unavailable, full, or cleared while the page is open.
- The same game open in two tabs.
- Offline at first load, and offline later.
- A player with no photo, a very long name, or a name with accents.
- Reduced motion requested. A screen 320 pixels wide. A screen reader.
- A double tap on a button that spends coins.
- The clock moving backwards.

## Comments and documentation

- A comment says why, never what. Delete a comment the code already says.
- Each exported function of a package has a one-line JSDoc summary. Add
  `@param` and `@returns` only when the types don't say enough.
- No commented-out code. No `TODO` without a task id: `// TODO(T-0042): ...`.
- Write prose under the `technical-writing` skill.
