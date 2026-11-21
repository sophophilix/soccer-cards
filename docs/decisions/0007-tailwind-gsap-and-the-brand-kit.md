# ADR 0007: Tailwind CSS, GSAP and the brand kit

> Status: Approved
> Created: 2026-11-21T11:28:06Z
> Last reviewed: 2026-11-21T13:50:05Z
> Next review: Not scheduled

## Review guide

Decision requested: accept Tailwind CSS v4 for styling, GSAP for the motion a
player starts, and one brand kit that every screen uses.

Check these points:

- [ ] D1: every colour, font, size, radius, shadow and easing lives in
      `apps/web/src/app.css`, and `docs/design/brand-kit.md` explains it.
- [ ] D3: GSAP's licence is its own no-charge licence, not an open source
      one. It allows a free site for children.
- [ ] D4: card art stays in scoped CSS on the same tokens.

Respond with `approve`, `approve with follow-up: <action>` or
`request changes: <specific issue>`.

## Summary

On 2026-11-21 the tech lead paused the delivery checks to bring the site up to
the approved prototype, and chose Tailwind CSS and GSAP ("build it in tailwind
css, gsap and follow project design guide, brand kits, centralise everything").
This record writes that decision down so the checks can follow it when they
return.

## Context

- The Packs, Match, Cards and Guide screens each carried a copy of the
  prototype's button and chip styles. Screens drifted apart, and styling was
  what got cut when a task ran over its size limit.
- The prototype's motion (pack tear, card arrival, flip, tilt) was never
  built. Its loops (foil sheen, glow, trading wobble) were.
- The page's security policy refuses style attributes and requests to other
  hosts (ADR 0002 D5, ADR 0003 D6).

## Decisions

**D1. One brand kit.** `app.css` holds the semantic colours as CSS variables
that dark mode swaps, and exposes them, the fonts, the type scale with
`clamp()`, tracking, radii, shadows, easings and loops as Tailwind `@theme`
tokens. `docs/design/brand-kit.md` is the written guide. A component uses a
token, never a raw value.

**D2. Tailwind CSS v4** (`tailwindcss` and `@tailwindcss/vite` 4.3.5, dev
dependencies). It builds one stylesheet at build time, so the site makes no
new request. Shared components are classes in Tailwind's components layer
(`lib/ui/controls.css`). Views use utilities for layout.

**D3. GSAP** (`gsap` 3.15.1, a dependency) runs every animation a player
starts, through `lib/ui/motion.ts`: the pack tear, a card's arrival, the flip,
the tilt and a result's pop. Its licence is GSAP's Standard no-charge licence
(https://gsap.com/standard-license), which allows use on a free site. GSAP
writes styles through the CSS object model, which the security policy allows.
It adds about 33 kB of compressed script (measured by the T-0124 review).

The terms were read on 2026-11-21T13:50:05Z: effective 2025-04-30, last
modified 2025-05-30, copyright Webflow. They grant any person a worldwide
licence for any website or app, commercial use included, with every plugin.
The prohibited use is a no-code tool for building animations that competes
with Webflow, which this site isn't. Proprietary notices must not be removed.
Webflow may revise the terms; a revision applies to GSAP versions released
after it, and earlier versions stay under the terms they shipped with. So a
GSAP upgrade rereads the terms first.

**D4. CSS keeps two things.** The loops that run on their own (sheen, glow,
wobble) stay in CSS, because the browser runs them off the main thread. The
card art stays in each card component's scoped CSS, on the same tokens,
because its layered gradients and container units don't read well as
utilities. A component tested without the global stylesheet must still size
itself.

**D5. Reduced motion is decided in one place.** Each GSAP function finishes
at once when the player asks for reduced motion. A rule in `app.css` stops
every CSS loop.

## Consequences

- `sveltekit-web`'s styling and animation rules need updating to point at
  this record and the brand kit.
- A shared class must not reuse a Tailwind utility's name. The pick grid's
  `fixed` class became `deck` after Tailwind pinned it to the screen.
- Component tests load no global stylesheet, so a component's own size can't
  depend on a utility class.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                                                                              |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-21T11:28:06Z | Drafted  | From the tech lead's decision in chat.                                                                                                                                             |
| 2026-11-21T13:50:05Z | Approved | The tech lead merged #209, then answered "yes to all" to approving this record after the T-0124 review (reviewer F8, security F1). D3 now records the GSAP terms as read that day. |
