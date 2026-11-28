# ADR 0013: National teams and squads

> Status: Proposed
> Created: 2026-11-28T08:00:19Z
> Last reviewed: 2026-11-28T08:00:19Z
> Next review: Not scheduled

## Review guide

Decision requested: let a child build a five-card national team and play
another country, and build a five-card squad for a club, with the rules
below.

Check these points:

- [ ] D2: a national match is five a side and reuses the match engine.
- [ ] D4: a national win pays 6 coins, and a full squad pays 10 coins once.
- [ ] D5: the names we use, with no trademarked competition name.
- [ ] D6: what the child sees when a country or a club has too few cards.

Respond with `approve`, `approve with follow-up: <action>` or
`request changes: <specific issue>`.

## Summary

The tech lead asked for team building in `docs/product/feature-list.md` (P2
and P3). A child collects players of one country, such as Australia, and
plays that team against another country, such as Argentina. A child also
collects a club's players to complete its squad. The tech lead answered on
2026-11-28:

- A national team is complete with 5 cards of one country, one of them a
  goalkeeper. The opponent is a computer team made from that country's
  players.
- A squad is complete with any players from the club, and the challenge
  stays open all year, with no deadline.

This record sets the rest: the match format, the pay, the names and the
edge cases.

## Context

- ADR 0003 D5: coins are earned in play and have no money value. No timer,
  streak, countdown or notification, and nothing punishes stopping.
- ADR 0010 D1: one economy table holds every coin earned and spent. D5:
  nothing is sold against a clock. D10: no trademarked competition name.
- ADR 0009 D1 item 4: leagues and cups need their own record. This record
  covers national teams and squads only, not a league or a cup.
- The match today is 11 a side (`TEAM_SIZE`), with moments and penalties.
  The computer's side comes from packs it opens by division.
- The set holds 104 players on `main`, growing to about 264 with wave 1
  (T-0203 to T-0207). Many countries have fewer than 5 players.

## Decisions

**D1. A national team.** A child picks 5 cards they own from one national
team, one of them a goalkeeper. A card counts for the national team in its
`nationalTeamCode`. A traded card counts like any other.

**D2. A national match.** A national match is five a side: one goalkeeper
and four outfield players. It reuses the match engine, its moments and
penalties, with a team size of 5. The opponent is a computer team of 5
players of the chosen country, picked from the whole set by the same rule
as a division side: the best goalkeeper and the four best outfield players
by overall. The child picks any country that the set can field (D6).

**D3. A squad.** A squad belongs to one club. It is complete when the child
owns 5 different cards whose current club is that club. The Cards screen
shows each club's squad with how many of the 5 the child has. A squad never
closes and never resets.

**D4. Pay.** Two new rows go in the economy table, with a new
`ECONOMY_VERSION`:

| Earn                                     | Coins |
| ---------------------------------------- | ----- |
| A national match win                     | 6     |
| Completing a club's squad, once per club | 10    |

A draw or a loss pays nothing and takes nothing, as a match does today.

**D5. Names.** Countries use their plain English names, such as Australia
and Argentina. Clubs use their names from the data, without a crest (ADR
0009 D7). No competition name is used: the screens say "National match" and
"Squads".

**D6. Too few cards.** A country is playable as an opponent only when the
set has at least 5 of its players, one of them a goalkeeper. A club has a
squad only when the set has at least 5 of its current players. Countries
and clubs below that are not listed, so a child never chases a team they
can't finish.

**D7. Prototype first.** Both screens are drawn in the prototype and
approved before they are built (ADR 0009 D3, ADR 0010 D7). They sit under
Play (the national match) and Cards (squads).

## Consequences

- The match engine takes the team size as a parameter. The 11-a-side match
  doesn't change.
- Player state gains the set of clubs whose squad reward was paid, with a
  version bump and a migration (ADR 0001 D6).
- Wave 1 should give the bigger countries and clubs at least 5 players each,
  one a goalkeeper. The batch briefs already ask for 10 from one club.

## Alternatives considered

- **11 a side for national teams.** Matches today's game, but a child would
  need 11 cards of one country. The tech lead chose 5.
- **Named players for a squad.** A fixed list such as "these 5 players".
  The tech lead chose any players from the club.
- **Squads tied to a real season.** Makes a countdown, which ADR 0003 D5
  and ADR 0010 D5 rule out.

## Review history

| Reviewed at          | Decision | Notes                                                            |
| -------------------- | -------- | ---------------------------------------------------------------- |
| 2026-11-28T08:00:19Z | Drafted  | From the tech lead's answers of 2026-11-28 and the feature list. |
