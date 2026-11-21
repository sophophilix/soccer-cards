# Soccer Cards brand kit and design guide

> Status: In review
> Created: 2026-11-21T11:28:06Z
> Last reviewed: 2026-11-21T11:28:06Z
> Next review: Not scheduled

This guide is for anyone who builds or changes a screen. Every value here lives in one place in code, and a component uses the token, never the raw value.

| What                                                                      | Where in code                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Colours, fonts, type scale, tracking, radius, shadow, easing, loops       | `apps/web/src/app.css` (`:root` and `@theme`)                      |
| Shared components (button, chip, badge, grids, pack, board, modal, toast) | `apps/web/src/lib/ui/controls.css`, in Tailwind's components layer |
| Motion a player starts (tear, arrival, flip, tilt, pop)                   | `apps/web/src/lib/ui/motion.ts` (GSAP)                             |
| Card art (front, back, foil, frames)                                      | `apps/web/src/lib/cards/*.svelte`, scoped CSS on the same tokens   |
| The approved look                                                         | `prototype/soccer-cards-prototype.html`                            |

ADR 0007 records why the site uses Tailwind CSS v4 and GSAP.

## The idea

The site is a mown football pitch with cards on it. Two match-day colours carry the meaning: the red card is the action you take, and the yellow card is what you've won or chosen. Type is loud and condensed, like a sticker album.

## Colour

Each colour is a CSS variable that dark mode swaps, and a Tailwind colour with the same name (`bg-surface`, `text-fg`, `border-line`).

| Token                     | Light                             | Dark                  | Use                                                |
| ------------------------- | --------------------------------- | --------------------- | -------------------------------------------------- |
| `bg`                      | `#e7f0ea`                         | `#0c1914`             | The pitch                                          |
| `stripe`                  | `#dde9e1`                         | `#10211a`             | The pitch's mown stripes                           |
| `surface`                 | `#ffffff`                         | `#162a21`             | Panels, buttons, empty states                      |
| `fg`                      | `#10231c`                         | `#eaf4ee`             | Text, outlines, button shadows                     |
| `muted`                   | `#4f6a60`                         | `#93aea2`             | Secondary text and section labels                  |
| `line`                    | `#c4d6cb`                         | `#29443a`             | Dashed borders and dividers                        |
| `accent` / `accent-ink`   | `#e03317` / white                 | `#ff5a3c` / `#1a0703` | The red card: the main action, goals, "New!"       |
| `booking` / `booking-ink` | `#ffc93c` / `#1b1503`             | same                  | The yellow card: chosen, won, the division, Legend |
| `focus`                   | `#3586ff`                         | `#3d8bff`             | The focus ring only                                |
| `att` / `def` / `ctrl`    | `#ff5a3c` / `#3d8bff` / `#2fcb7a` | same                  | The three card stats, and the green "picked" tick  |
| `card-ink` / `card-paper` | `#0e1512` / white                 | same                  | Inside the card art and the score board            |

The red and the light-mode blue are darker than the prototype's, so text on them meets WCAG 2.2 AA.

## Type

Three families, all served from the site's own origin through `@fontsource`.

| Family                       | Token          | Use                                                  |
| ---------------------------- | -------------- | ---------------------------------------------------- |
| Bowlby One                   | `font-display` | The game name, headings, player names, the pack name |
| Saira Condensed, 600 and 800 | `font-data`    | Buttons, tabs, chips, labels, numbers                |
| Figtree, 400 to 700          | `font-body`    | Sentences                                            |

The type scale grows with the screen between a phone and a laptop:

| Token                               | Size                      | Use                                 |
| ----------------------------------- | ------------------------- | ----------------------------------- |
| `text-masthead`                     | `clamp(24px, 6vw, 36px)`  | "Soccer Cards"                      |
| `text-heading`                      | `clamp(20px, 5vw, 26px)`  | A view's title and section headings |
| `text-result`                       | `clamp(28px, 8vw, 44px)`  | "You win!"                          |
| `text-score`                        | `clamp(34px, 10vw, 52px)` | The score, italic                   |
| `text-button` / `text-button-small` | 17px / 15px               | Buttons                             |
| `text-tab`                          | 16px                      | Tabs                                |
| `text-label`                        | 15px                      | Chips, `h3` and labels, in capitals |
| `text-body`                         | 16px, line height 1.5     | Sentences                           |

Labels and buttons are uppercase with wide letter spacing: `tracking-button` (0.08em), `tracking-label` (0.12em), `tracking-heading` (0.14em).

## Shape and depth

| Token           | Value             | Use                                                        |
| --------------- | ----------------- | ---------------------------------------------------------- |
| `radius-pill`   | 999px             | Buttons, tabs, coins, toasts                               |
| `radius-panel`  | 14px              | Empty states, the score board                              |
| `radius-banner` | 10px              | Banners                                                    |
| `radius-chip`   | 4px               | Chips                                                      |
| `shadow-press`  | `0 3px 0` in `fg` | A button sits on its shadow and drops onto it when pressed |

Cards are sized from their own width with container units, so one card component draws every size. Their corners are `5cqw`.

## Components

Use these classes from `controls.css`, and Tailwind utilities for layout around them.

- **Buttons:** `.btn`, `.btn.primary` for the one main action, `.btn.small`. A toggle uses `aria-pressed` and turns yellow when on.
- **Chips:** `.chip`, `.chip.new` (red, tilted), `.chip.legend` (yellow), `.chip.icon` (prism).
- **Small cards:** `CardSlot.svelte` inside `.grid` (with `cols-3`, `cols-5` or `cols-7`), `.grid.deck` (fills the row), or `.grid.summary`. Badges: `.badge.count`, `.badge.star`, `.badge.tick`.
- **Big card:** `BigCard.svelte`, with a back to flip and `arrive` for a new card.
- **Panels:** `.empty`, `.banner`, `.meter`, `.missing`.
- **Match:** `.board`, `.lines` and `.line`, `.log` (`li.goal` for goals), `.pens`, `.result`, `.teams`.
- **Overlays:** `.modal` with `.sheetbox`, and `.toast`.

Don't name a shared class after a Tailwind utility. A class called `fixed`, `hidden`, `block` or `static` gets that utility's style too.

## Motion

GSAP runs every animation a player starts, through `lib/ui/motion.ts`. CSS runs only the loops that play on their own.

| Moment                                 | Where                                           | Timing                                        |
| -------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Pack tear: shake, rip the strip, drop  | `tearPack`                                      | 0.7s shake, rip at 0.35s for 0.45s, 0.3s drop |
| A new card rises in                    | `arrive`                                        | 0.5s, `back.out`                              |
| Card flip                              | `turnCard`                                      | 0.55s, `back.out`                             |
| Tilt toward the pointer, glare follows | `tiltToPointer`                                 | Follows in 0.08s, settles in 0.55s            |
| A result lands                         | `pop`                                           | 0.35s                                         |
| Foil sheen on a still big card         | `animate-sheen` (CSS)                           | 5s, back and forth                            |
| Legend glow, Icon prism                | `animate-pulse-glow`, `animate-spin-glow` (CSS) | 1.2s, 3s                                      |
| Cards wobble while trading             | `animate-wiggle` (CSS)                          | 0.32s                                         |

With reduced motion, every GSAP function finishes at once, the tilt stays still and every CSS loop stops.

Animate only `transform` and `opacity`. Nothing flashes more than three times a second. Every reveal has a skip.

## Rules the look must keep

- The page's security policy refuses style attributes. Set a value through a class, or through `element.style.setProperty` in an attachment. GSAP already works that way.
- The site requests nothing from another host, fonts included.
- Every control is a real button or link with a name, at least 44px across (`--tap-target-min`).
- Text meets AA contrast in both themes. Check a new colour pair before you use it.

## Review history

| Reviewed at          | Decision | Notes                                                     |
| -------------------- | -------- | --------------------------------------------------------- |
| 2026-11-21T11:28:06Z | Drafted  | First version, from the prototype and the tokens in code. |
