# Soccer Cards feature list

> Status: In review
> Created: 2026-11-28T05:10:40Z
> Last reviewed: 2026-11-28T05:10:40Z
> Next review: Not scheduled

This is the one list of what Soccer Cards does, what is decided but not
built, and what is proposed. The lead keeps it current after each feature
merges. A feature moves into "Decided" only when the tech lead approves it,
in this file or in a decision record.

## Review guide

Decision requested: approve this list as the feature backlog, and answer the
open questions in "Proposed by the tech lead".

Check these points:

- [ ] "Built" matches what you see on the live site.
- [ ] "Decided, not built" is in the order you want.
- [ ] The questions under each proposal are the right ones.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Built

Every view and game in the approved prototype
(`prototype/soccer-cards-prototype.html`) is on
<https://soccercards.dsantmaj.com>. Guess the Club and Pairs were deployed on
2026-11-28.

| Area                  | What a child does                                                       | Notes                                    |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| Packs                 | Buys a pack (5 coins) or a jumbo (20) and opens it                      | Odds by tier: Base, Rare, Legend, Icon   |
| Cards                 | Browses the collection, opens a card large, flips it, trades duplicates | Card back shows club and country goals   |
| Match                 | Picks a team, plays moments and penalties, wins coins by division       |                                          |
| Games: Pairs          | Turns cards to find matching players, on 6, 8 or 10 pair boards         | 3 to 5 coins, plus 1 for few turns       |
| Games: Transfer Trail | Puts a player's clubs in the order they joined them                     |                                          |
| Games: Connections    | Names a club two players both played for                                |                                          |
| Games: Guess the Club | Picks the club hidden in a player's career                              | 1 coin per right answer, 2 for finishing |
| Guide                 | Reads how the game works                                                |                                          |
| Player data           | 64 players with licensed photos and credits                             | Static API, `data/api/v1/`               |

### Fixes in progress (prototype parity)

- Games menu text alignment (T-0201, merged, not yet deployed).
- Guess the Club revealed row contrast in dark mode (T-0202).
- An accessibility scan for every game screen (T-0197).
- A screen-by-screen comparison with the prototype. Known items:
  - The prototype's goalkeeper card back shows clean sheets and caps. The
    site shows goals, and the data has no clean sheets or caps yet.
  - The Pairs and Connections wording differs from the prototype.

## Decided, not built

These come from accepted decision records. ADR 0010 D7 and D9 say the
prototype is redrawn and approved before each one is built.

| Order | Feature                                | Source          | What a child does                                                                          |
| ----- | -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| 1     | New tabs: Shop, Cards, Play, Me, Guide | ADR 0010 D7     | Finds games, training and the character under Play and Me                                  |
| 2     | Shop with odds shown                   | ADR 0010 D2     | Buys packs, jumbos, team packs, special editions and clothes                               |
| 3     | Team packs                             | ADR 0010 D4     | Buys 10 cards of one club's current players, for 10 coins                                  |
| 4     | Card levels and juggling               | ADR 0010 D3, D8 | Trains a card to raise its level, which adds a small match bonus                           |
| 5     | Other training sessions                | ADR 0010 D8     | Goal scoring, headers, dribbling, basic skills, goalkeeping                                |
| 6     | My player                              | ADR 0010 D6     | Builds a drawn character and buys clothes for it                                           |
| 7     | Special editions                       | ADR 0010 D5     | Earns or buys a gold-foil second card of a real player                                     |
| Any   | Larger player set                      | ADR 0008 D6     | Waves: top five European leagues, then other leagues and national teams, then the A-League |

The player API in ADR 0008 has started: `GET /api/v2/players/{player}`
answers from the database (T-0136). The site still reads the 64-player
static files.

ADR 0009 is still in review. It proposes a career journey with search,
club pages and a world atlas, then leagues and cups.

## Proposed by the tech lead

From the tech lead's note in `docs/product/Product-direction.md`
(2026-11-24):

> There are only 64 players currently on the main website and all players
> are mostly australian. we need to plan the packs in such a way that we
> get a mix of players such that its not just all australia or one
> conuntry

The data agrees. Of 64 players, 19 play for Australia, 11 for England, 6 for
France and 5 for Germany. Argentina and Croatia have one each.

### P1. A mix of countries in every pack

More players come from the ADR 0008 D6 waves. A pack rule could also limit
how many cards from one country a pack holds.

Questions for the tech lead:

1. Do we start wave 1 (the top five European leagues) now? How many
   players should the site hold after it?
2. Should a pack limit cards from one country, for example at most 3 of 8?
   Or is a bigger, balanced set enough?

Decided by the tech lead on 2026-11-28:

- Start wave 1 now with about 200 players, in five batches of 40, one per
  league (T-0203 to T-0207).
- A standard pack holds at most 3 cards from one national team, and a
  jumbo pack scales that to 15 of 50 (T-0208, T-0209).

### P2. Build a national team and play other countries

A child collects players of one country, such as Australia, and plays that
team against another, such as Argentina.

Questions for the tech lead:

1. What makes a team complete: 11 players, or a smaller squad such as 5,
   with at least one goalkeeper?
2. Does the opposing country play as a computer team made from the full
   player set?
3. Does a national team match pay coins by the same table as a match win?

Decided by the tech lead on 2026-11-28: a national team is complete with 5
cards of one country, one of them a goalkeeper. The opponent is a computer
team picked from that country's players. Questions 2 and 3 go into the
decision record.

### P3. Seasonal squads for leagues and cups

While the Premier League, a European competition or another league is on,
a child scouts and trades cards to build that league's or club's squad.
Completing a squad unlocks a reward.

Questions for the tech lead:

1. Is "complete" a fixed list of named players (a, b and c), or any players
   from that club or league?
2. What does a complete squad earn: coins, a special edition (ADR 0010 D5),
   or a trophy?
3. ADR 0010 D5 says nothing in the shop is sold against a clock. Can a
   squad challenge be tied to a real season's dates, or does it stay open
   all year?
4. ADR 0010 D10 bans trademarked competition names. Do we use names such as
   "English top league" and "European Club Cup"?

Decided by the tech lead on 2026-11-28: any N players from the club or
league complete a squad, and the challenge stays open all year, with no
deadline. Questions 2 and 4 go into the decision record.

P2 and P3 change the match rules, so each needs a decision record (ADR 0009
D1 item 4). The lead drafts it after your answers.

## Review history

| Reviewed at          | Decision | Notes                                                                             |
| -------------------- | -------- | --------------------------------------------------------------------------------- |
| 2026-11-28T05:10:40Z | Drafted  | Initial version, from the prototype, ADRs 0008 to 0010, and the tech lead's note. |
| 2026-11-28T06:22:35Z | Answered | The tech lead answered P1, P2 question 1 and P3 question 1. Briefs T-0203 to T-0209 added. |
