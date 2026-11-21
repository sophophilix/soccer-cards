---
name: sveltekit-web
description: "Guides work on the SvelteKit 3 web app in apps/web: project structure, Svelte 5 components, routing and prerendering, player state, offline use, card animation, accessibility and performance. Use when creating or changing anything under apps/web. Requires ts-standards, ts-style-guide and child-safety-privacy."
metadata:
  version: "1.0.0"
---

# SvelteKit web app

Read `ts-standards`, `ts-style-guide` and `child-safety-privacy` first. The
approved look and behaviour is `prototype/soccer-cards-prototype.html`. Build
what it shows. A change to the design is a new task from the tech lead.

## Use current Svelte, not remembered Svelte

SvelteKit 3 and Svelte 5 differ from most examples a model has seen.

- When the official Svelte plugin is installed, fetch the documentation
  section you need from its MCP server, and run `svelte-autofixer` on every
  `.svelte`, `.svelte.ts` and `.svelte.js` file before you finish.
- Without the plugin, read the page on `svelte.dev/docs` for the API you are
  about to use. Don't write an API from memory.

SvelteKit 3 changes that catch agents out, from the migration guide:

| Old | Now |
|---|---|
| `svelte.config.js` | Options go to the `sveltekit()` plugin in `vite.config.js` |
| `$lib/...` | `#lib/...`, declared in `package.json` `imports`, with file extensions |
| `$app/stores` | `$app/state`, without the `$` prefix |
| `$app/environment` | `$app/env` |
| `$env/...` | `$app/env/private` and `$app/env/public` |
| `base`, `assets` from `$app/paths` | `resolve` and `asset` |
| `src/params/` folder | One `src/params.ts` using `defineParams` |
| `invalidateAll` | `refreshAll` |

Svelte 5 uses runes: `$state`, `$derived`, `$effect` and `$props`. Don't use
`export let`, `$:` or stores for component state.

## Structure

```text
apps/web/
  src/
    lib/
      cards/        The card component and its parts
      packs/        Pack opening
      collection/   Grid, favourites, trading
      battle/       Team picker and battle
      guide/        Collector guide
      state/        Player state: the only module that touches storage
      data/         Loading and validating the static API files
      ui/           Shared buttons, dialogs, toasts
    routes/         One folder per view. Thin: load data, compose lib parts
    service-worker/ Offline support
    app.html
  static/           Files served unchanged, including _headers
  tests/            Playwright tests
```

- Group by feature, not by file type.
- A route file composes. Rules live in `packages/game`, and state lives in
  `lib/state`.
- A component used by one route may sit beside that route.
- No `server` folders and no remote functions in the first version
  (ADR 0001 D7).

## Components

- One component, one job. Split one that passes 150 lines of markup.
- Type props with an interface and `$props()`. Give every optional prop a
  default.
- Data goes down as props. Events come up as callback props.
- Derive with `$derived`. Use `$effect` only to reach outside Svelte, such as
  a canvas or storage, and clean up what it starts.
- Never use `{@html}`.
- Style with Tailwind CSS v4 utilities and the shared component classes in
  `lib/ui/controls.css` (ADR 0007). Every colour, font, size, radius, shadow
  and easing is a token in `src/app.css`; `docs/design/brand-kit.md` explains
  them. Never write a raw value a token covers.
- Card art keeps scoped CSS on the same tokens, and sizes itself without the
  global stylesheet, as component tests load none.
- Never name a shared class after a Tailwind utility (`fixed`, `hidden`,
  `block`, `static`).
- The prototype is the source of truth for the look. The `frontend-design`
  skill helps you build it well; it doesn't change it.
- Size the card from its own width with container units, as the prototype
  does, so one component serves every size.

## Routing and rendering

- Every route is prerendered. `adapter-static` builds the site.
- Player state exists only in the browser. Render a designed loading state on
  the server pass and fill it on the client. Never read storage during
  prerendering.
- Each view has its own address, so the back button and a shared link work.
- Use `resolve()` for every internal link.

## Player state

- `lib/state` is the only code that reads or writes storage. A lint rule
  refuses it elsewhere.
- State has a `version`. Loading runs it through a schema check and then
  through the migrations in order.
- Invalid state is backed up under another key and replaced with a fresh
  start. Tell the player in plain words.
- Storage can throw or be missing. The game still runs for the session.
- Write state after every change that matters, such as a pack added or coins
  spent. A crash never costs a child a card.
- Guard an action that spends coins against a double tap.
- Listen for the storage event so two open tabs don't overwrite each other.

## Offline and installable

- The service worker caches the app shell, the API files and the photos, so
  the game works with no connection after the first visit.
- A new version activates on the next visit and never in the middle of a
  battle or a pack opening.
- The service worker has its own `tsconfig.json`, as SvelteKit 3 requires.

## Animation

- Animate `transform` and `opacity` only. Never animate layout properties.
- GSAP runs every animation a player starts, through `lib/ui/motion.ts`. CSS
  runs only loops that play on their own (ADR 0007). Add a new motion as a
  function there, with its timing in `MOTION`.
- Keep the flip, the foil, the tilt and the pack tear from the prototype.
- Under `prefers-reduced-motion`, replace movement with a plain change. A
  test covers it.
- Nothing flashes more than three times in a second.
- An animation never blocks input for more than a moment. Every reveal has a
  skip.

## Accessibility

The target is WCAG 2.2 level AA. On every change:

- Every control is a real `button`, `a` or form element with an accessible
  name.
- Everything works with the keyboard, in a sensible order, with a visible
  focus ring.
- A card states its player, tier and stats to a screen reader. Colour is
  never the only signal for a tier.
- A dialog traps focus, closes on Escape and returns focus where it was.
- Text contrast meets AA in both themes. Touch targets are at least 44 by 44
  CSS pixels.
- Words are short and plain. The readers are children.
- A change of state, such as coins earned, is announced through a live
  region.

## Performance

- The phone is the target. Design at 360 pixels wide first.
- The tech lead sets the budgets for script size and Core Web Vitals in the
  first web task. CI fails a pull request that breaks one.
- Photos are served in a modern format at the sizes the card needs, with
  `width` and `height` set, and lazy loaded below the fold.
- Fonts are served from the site's own origin with `font-display: swap`.
- Render a long grid in pieces if it grows past a few hundred cards.

## Before you finish

1. Run `svelte-autofixer` on each Svelte file you changed, when available.
2. Run `make check COMPONENT=web`.
3. Open the view at 360 pixels wide and with reduced motion, and say in your
   report that you did or that you couldn't.
