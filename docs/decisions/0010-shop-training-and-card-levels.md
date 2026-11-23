# ADR 0010: A shop, a training ground and card levels

> Status: Accepted
> Created: 2026-11-22T17:29:52Z
> Last reviewed: 2026-11-23T02:16:22Z
> Next review: Not scheduled

## Review guide

Decision requested: add a coin shop, a training ground with mini-games, and
a level on each card, with one economy table for every coin earned and
spent, and a new navigation that holds them.

Check these points:

- [ ] D1: the coin numbers feel right for your child. They're a first
      guess, to tune after play.
- [ ] D3: a card's printed rating never changes, and a level gives only a
      small, capped bonus in matches.
- [ ] D5: special editions never expire and are never sold against a
      clock.
- [ ] D7: the new tabs (Shop, Cards, Play, Me, Guide).

Respond with `approve`, `approve with follow-up: <action>` or
`request changes: <specific issue>`.

## Summary

The tech lead's child asked on 2026-11-22 for a shop, a training ground with
juggling, dribbling and other sessions, cards that level up, a character
with clothes, and tournaments with trophies. The tech lead answered four
questions the same day:

- A card's starting "value" is its starting level: Base 1, Rare 5.
- "Limited edition" cards become special editions that never expire.
- Tournaments use our own names, not "Champions League" or "La Liga".
- Draw memory pairs in the prototype first (T-0149), and draft this
  record for the rest.

Tournaments need many more players per club and country, so they get their
own record later, as ADR 0009 D1 already says.

## Context

- ADR 0003 D5: coins are earned in play and have no money value. No timer,
  streak, lives, countdown or notification. Nothing punishes stopping.
- Rule 8 and ADR 0006: a card's ratings come only from this project's
  formula.
- ADR 0001 D6: player state lives on the device, with a version number and
  a migration for each change of shape.
- ADR 0009 D3 and D6: a new screen is drawn in the prototype first, and
  games teach and never punish.
- Prototype version 6 today: a pack costs 5 coins, a jumbo 20. A match win
  pays 4 to 10 coins by division. Two free packs at the start.

## Decisions

**D1. One economy table.** Every way to earn or spend coins is in one
module in `packages/game`, with named constants and a version, like the
ratings formula. Nothing else gives or takes coins. The first numbers:

| Earn                            | Coins                                   |
| ------------------------------- | --------------------------------------- |
| A match win                     | 4 to 10 by division (unchanged)         |
| A memory pairs board (T-0149)   | 3, 4 or 5 by size, plus 1 for few flips |
| Juggling                        | 1 per 15 juggles, as the child asked    |
| Any other training session      | 1 per 15 points                         |
| A tournament win (later record) | To be set by that record                |

| Spend                                      | Coins          |
| ------------------------------------------ | -------------- |
| A pack (8 base, 2 lucky)                   | 5 (unchanged)  |
| A jumbo pack                               | 20 (unchanged) |
| A team pack (D4)                           | 10             |
| A piece of clothing for the character (D6) | 5 to 15        |
| A special edition card (D5)                | 30             |

There is no daily limit, because a limit that resets each day works like a
countdown. If one source earns far more than the rest after play, the
table changes in a reviewed pull request.

**D2. The shop.** The Packs screen becomes the Shop. It sells packs,
jumbos, team packs, special editions and clothes. Every pack shows its
odds before it's bought, as the child-safety rules ask for honest
mechanics.

**D3. Card levels.** Each card the child owns has a level, stored on the
device. It starts by tier: Base 1, Rare 5, Legend 9, Icon 13. The highest
level is 20.

- Training a card raises its level (D8).
- In a match, a card adds a bonus of one point to its attack, defence and
  control for every 4 levels, at most 5. A level 1 Base card adds nothing,
  and a level 20 card adds 5.
- The printed overall and ratings never change, so a card still shows what
  our formula says about the real player. The level shows as stars beside
  the card.
- A traded card keeps its level. A duplicate of a card the child already
  has can be given to that card as training points instead of trading it.

**D4. Team packs.** A team pack holds 10 cards of one club's current
players, with the same tier odds as a pack. It's sold only for a club with
at least 10 players in the set. The club appears by name and its colours
(ADR 0009 D7), never its crest.

**D5. Special editions.** A special edition is a second, gold-foil card of
a real player, drawn by this project. Its ratings are the formula's, like
any card. Once released it never expires, and it's earned by a trophy or
bought for coins at any time. Nothing in the shop is sold against a clock.

**D6. My player.** The child gets a character drawn by this project from
parts: face, hair, skin tone, kit colours, boots and accessories. Clothes
are bought in the shop. The character is never a photo. If the child types
a name for it, the name stays on the device and is shown to no one else.

**D7. Navigation.** The tab bar becomes **Shop**, **Cards**, **Play**,
**Me** and **Guide**. Play holds the match, the memory games, the training
ground and, later, tournaments. Me holds the character and the trophy
cabinet. The prototype is redrawn with these tabs before any of them is
built.

**D8. The training ground.** Training is a set of short mini-games. The
child picks a card to train, plays a session, and the card gets the points
as training points (every 10 points raise a level) and the coins from D1.
A round ends when the ball drops or the drill finishes. The screen shows
the score and offers another go. It never says "you lose", and there are no
lives.

| Session      | How it plays                                                                   | Trains    |
| ------------ | ------------------------------------------------------------------------------ | --------- |
| Juggling     | Tap as the ball falls. Too early or too late and it drops. One point per touch | Control   |
| Goal scoring | Stop a moving aim marker, then a power bar. Reuses the penalties code          | Shooting  |
| Headers      | A ball crosses in. Tap when it reaches head height                             | Physical  |
| Dribbling    | Switch lanes to pass cones as the player runs up the screen                    | Dribbling |
| Basic skills | Watch a short sequence of moves, then repeat it                                | Passing   |
| Goalkeeping  | Tap left or right as shots come in                                             | Diving    |

Every session works by touch and by keyboard. With reduced motion, the ball
moves more slowly and nothing flashes.

**D9. Order.** Memory pairs (T-0149, ADR 0009), then the navigation and
shop with the economy module, then juggling and levels, then the other
sessions, then the character. Each starts as a prototype drawing the
children try.

**D10. Names.** The prototype's top division, "Champions League", becomes
"European Club Cup". No competition's trademarked name is used.

## Consequences

- The saved state grows: levels, training points, the character, clothes
  owned and special editions. Each change gets a version and a migration.
- `packages/game` gains the economy module, levels and the match bonus,
  each with property tests. The match engine changes, so its tests change.
- The prototype needs a redraw for the new tabs before any screen is built.
- Team packs wait for enough players per club.

## Risks and open items

- **Balance.** The numbers in D1 and D3 are guesses until the children
  play. The prototype is where they're tuned.
- **Too much to do.** Each feature here is several tasks. The order in D9
  keeps one playable step at a time.
- **Motion.** Juggling and headers need moving objects. Reduced motion
  slows them, but can't remove motion from a game about a moving ball.
- **Legend and Icon starting levels** (9 and 13) are the lead's proposal.
  The child said only Base 1 and Rare 5.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                                                                |
| -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-22T17:29:52Z | Drafted  | From the child's requests passed on by the tech lead on 2026-11-22, and the tech lead's answers: "Starting level", "Special editions", "Our own names", "Yes, both". |
| 2026-11-23T02:16:22Z | Accepted | Approved by the tech lead in the main session: "approve ADR 0010 while we wait".                                                                                     |
