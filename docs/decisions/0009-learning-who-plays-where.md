# ADR 0009: Learning who plays where: career history, search, memory games and club pages

> Status: In review
> Created: 2026-11-21T21:54:01Z
> Last reviewed: 2026-11-21T21:54:01Z
> Next review: Not scheduled

## Review guide

Decision requested: add four features that help children learn which player
played where. They are memory games, a scrolling career journey with search,
club pages with an atlas of the collection, and later leagues and cups. The
features rest on one new data field, each player's club-by-club career.

Check these points:

- [ ] D1: the order matches what you chose, and leagues and cups wait for
      their own record.
- [ ] D3: each new screen is drawn in the prototype first, and you approve
      its look before its build tasks start.
- [ ] D4 and D6: search stays on the device, and no game punishes a child
      for a wrong answer or for stopping.
- [ ] D7: club colours from Wikidata and a drawn badge shape are enough
      without crests.

Respond with `approve`, `approve with follow-up: <action>` or
`request changes: <specific issue>`.

## Summary

The tech lead asked on 2026-11-21 for "a time line history who played at wch
club how many goals they scored... more in a creative way like some cool
gsap animation as they scroll", for search, and for "leagues and games based
on the clubs and country". They chose this order: memory games, the career
journey with search, club pages with the atlas, then leagues and cups.

Every feature needs to know each player's clubs, years, games and goals. The
pipeline already reads them from Wikidata (property P54 with the qualifiers
P580, P582, P1350 and P1351) and publishes only the totals. This record
publishes the spells and sets the rules the new screens follow.

## Context

- ADR 0003 D5: no data collected, no request to another host, no free text
  shared between players, nothing that punishes stopping.
- ADR 0005 D7 and D9: a fact keeps its source and read date. An optional
  field may be added to `v1`.
- ADR 0006 D1: Wikidata is the source of player facts, under CC0.
- ADR 0007 D3 and D5: GSAP runs every animation a player starts. Reduced
  motion is decided in one place.
- The prototype (`prototype/soccer-cards-prototype.html`) is the approved
  look. None of these screens is in it yet.

## Decisions

**D1. Scope and order.**

| Order | Feature                   | What a child does                                                                                                                               |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Memory games              | Puts a player's clubs in order (Transfer Trail), names a club two players shared (Connections), guesses the club from a career (Guess the Club) |
| 2     | Career journey and search | Finds a player, then scrolls their career drawn as a line of stations: club, years, games, goals                                                |
| 3     | Club pages and the atlas  | Sees every player in the set who played for a club, by decade. Sees the collection grouped by league and club, with how many of each they have  |
| 4     | Leagues and cups          | Plays a cup or a short season with real clubs and national teams. Needs its own decision record, because it changes the game rules              |

**D2. Career history in the data.** A player gains an optional
`careerSpells` list, oldest first. A spell has:

- `club`, the resource name `clubs/{club}`. Every club named in a spell has
  a record in `clubs.json`.
- `startYear`, and `endYear` when the spell has ended.
- `appearanceCount` and `goalCount`, each a fact with `sourceUri` and
  `retrieveDate` (ADR 0005 D7), when Wikidata has them.

A value Wikidata doesn't have is absent, never zero. Youth, reserve and
women's academy sides are left out, as the pipeline already does for the
national team code. National team spells are not part of this list.

**D3. Prototype first.** Each new screen is drawn in the prototype before
its build tasks are written. The tech lead approves the look, with the
children's verdict if they want it. A build task then matches that drawing.

**D4. Search stays on the device.** Search runs over the players the site
has already loaded: names, clubs, countries and positions, with accents
folded so that "mbappe" finds "Mbappé". What a child types is never sent,
stored or shown to anyone else. When the set moves to `/api/v2` (ADR 0008),
search uses that API's `filter` on the site's own address, with logs off.

**D5. Motion.** The career journey uses GSAP's ScrollTrigger, which ships in
the `gsap` package and is covered by the licence in ADR 0007 D3. No new
package is added. Every fact on the screen can be read with no animation,
and with reduced motion the journey is a plain list.

**D6. Games teach and never punish.**

- The rules of each game are pure functions in `packages/game`, with the
  random numbers passed in, like the pack rules.
- A question is made only from published facts. A question whose answer
  Wikidata doesn't have is never asked.
- A wrong answer shows the right one and the fact behind it.
- Rewards are coins earned in play. No timer, no streak that resets, no
  lives and no notification.

**D7. A club without its crest.** A club page shows the club's name, its
colours from Wikidata (P6364, official colour) and a badge shape drawn by
the project. It never shows a crest or a league logo (ADR 0003 D1). A club
with no colours in Wikidata gets the kit's neutral colours.

**D8. The atlas map is ours.** The world view is an SVG made from Natural
Earth (public domain) and committed to the repository. It loads no map
tiles and calls no map service.

## Consequences

- `packages/schema`, the pipeline and the published files change first.
  Every screen waits for that.
- More clubs appear in `clubs.json`: every club in any spell, not only
  current clubs.
- Each screen adds end-to-end tests, an accessibility scan and a privacy
  check (T-0129 already checks every screen).
- Memory games add game rules with property tests.

## Risks and open items

- **Wikidata spells have gaps.** Some spells have no games or goals, and
  some players have no spells at all. A game skips a question it can't
  answer. The journey shows a spell without numbers.
- **Loans.** Wikidata marks some spells as loans and not others. This
  record doesn't show loans. A later record may.
- **Leagues need players.** A season with real clubs feels empty with 64
  players. Leagues and cups wait for more batches as well as their record.
- **Repository size.** More players add more photos to git.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                                                |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-21T21:54:01Z | Drafted  | From the tech lead's request on 2026-11-21 and their choice of order: "Memory games, Career Journey + search, Club pages + Atlas, Leagues and cups". |
