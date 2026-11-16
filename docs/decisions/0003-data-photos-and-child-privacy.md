# ADR 0003: Data sources, photos and child privacy

> Status: Approved
> Created: 2026-11-15T11:16:22Z
> Last reviewed: 2026-11-16T07:30:27Z
> Next review: 2026-12-10

## Review guide

Decision requested: accept the content and privacy rules below as limits no
task may cross without a new decision.

Check these points:

- [ ] "Collect nothing" (D5) fits what you want for your children and for
      other people's.
- [ ] The licence list for photos (D2) is the one you accept.
- [ ] The limit on nudges in D5 fits your first note, which asked for
      progress tracking, nudges and game elements.
- [ ] You will get legal advice before relying on this record for compliance.
      It is an engineering position, not legal advice.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

The site publishes only content it has the right to publish, and it knows
nothing about the children who play. Both rules are checked by programs where
a program can check them.

## Context

- The site is public. Earlier discussion with the tech lead settled the
  direction: original card designs, no logos, Wikimedia photos with credit,
  an avatar where no photo exists, and ratings from the project's own
  formula.
- Australia's Children's Online Privacy Code is due to be registered by
  2026-12-10. The UK code asks for high privacy by default. Neither was read
  in full, and nobody has checked whether they apply here.
- Wikimedia requires an identifying User-Agent and limited request rates.

## Decision

**D1. Content the site may publish.**

| Content | Rule |
|---|---|
| Player names, clubs, positions, nationalities | Published as facts |
| Statistics such as goals and transfer fees | Published with the source and the date they were read |
| Ratings | Computed by this project's formula. A third party's ratings are never published |
| Photos | Only under D2 |
| Club crests, league and competition logos, card maker designs | Never |
| Flags | Drawn by the project |

**D2. Photos.** A photo is published only when the pipeline records all of
these for it: the Commons file page, the author, the licence, and that the
licence is on the allow list. The allow list is CC0, public domain, CC BY and
CC BY-SA, in any version. Anything else gets the avatar. The pipeline fails
the build for a photo without a complete record.

**D3. Credit.** Each card back shows the author and licence. A credits page
lists every photo with a link to its Commons page and its licence. Photos are
resized and not otherwise changed.

**D4. Fetching.** The pipeline identifies itself with a User-Agent that names
the project and a contact address the tech lead supplies. It waits between
requests, backs off on HTTP 429 and caches what it has. The site serves its
own copies and never links to a Wikimedia file directly.

**D5. The site collects nothing.**

- No accounts, sign-in, email addresses or names.
- No analytics, advertising, tracking pixels or fingerprinting.
- No cookies. Game progress is stored on the device only.
- No request from the running site to any other host. Fonts, scripts and
  images are served from the site's own domain.
- No chat and no free text shared between players.
- No purchases. Coins are earned in play and have no money value.
- Progress, badges and a collector guide are welcome. Nothing punishes a
  child for stopping: no streak that resets, no countdown, and no
  notification when the site is closed.

**D6. Enforcement.** The Content Security Policy allows the site's own origin
only. An end-to-end test fails if a page requests another host or sets a
cookie. A lint rule forbids the storage and network calls outside the two
modules that own them.

## Consequences

- There is no privacy notice to keep honest beyond "we collect nothing", and
  no data to lose.
- Progress can't follow a child from one device to another.
- Nobody can measure how the site is used. That is the price of D5.
- Some players will have an avatar where a free photo doesn't exist.

## Rejected

- **Hotlinking Wikimedia images.** It sends each child's address to a third
  party and breaks D5.
- **Privacy-friendly analytics.** Even a cookieless counter is a third-party
  request from a children's site. Review only with a decision record.
- **Photos found by web search.** Agencies own most of them and pursue reuse.

## Risks and open items

- **Legal position.** Whether the Australian or UK children's codes apply,
  and what they require, needs advice from someone qualified. The review date
  above is the Australian registration deadline.
- **Likeness.** Real names and photos of players are used as facts with
  licensed images. That is lower risk than an unlicensed likeness, and it is
  not no risk.
- **The pipeline contact address** is not chosen. The tech lead supplies it.
- **Photos can be deleted from Commons** after a licence dispute. The
  scheduled pipeline run must re-check each record.

## Review history

| Reviewed at | Decision | Notes |
|---|---|---|
| 2026-11-15T11:16:22Z | Drafted | Initial version, written by Claude for the tech lead. |
| 2026-11-16T07:30:27Z | Approved | The tech lead replied "approve all" in the lead session. |
