---
name: child-safety-privacy
description: "States what a public site for children must and must not do: no data collection, no third-party requests, no contact between players, honest game mechanics and age-appropriate content. Use when a task adds a feature, a dependency, a network call, storage, text shown to players, or anything social or reward-related."
metadata:
  version: "1.0.0"
---

# Child safety and privacy

The players are children. ADR 0003 holds the decision. This skill is the
checklist to apply to every feature. It is an engineering standard, not legal
advice.

## Stop and ask the tech lead first

A task that would do any of these needs a decision record before any code:

- store or send anything about a player off the device
- add an account, a name field, a profile or an avatar upload
- let one player's words or files reach another player
- add analytics, error reporting, advertising or any script from another
  host
- link out to another site
- involve money or anything bought
- use the camera, microphone, location or notifications

## Data

- The site collects nothing. No names, no emails, no ages, no identifiers.
- Game progress is stored on the device only, and only what the game needs.
- No cookies. No fingerprinting. No analytics, even ones called
  privacy-friendly.
- The running site makes no request to any other host. Every font, script,
  image and data file comes from the site's own origin.
- A new dependency must not phone home. Check before proposing it.
- Logs and error messages hold no player data, because there is none to
  hold.

## Contact between players

- No chat, comments, messages or free text that another player sees.
- A future two-player mode uses fixed choices only: a room code made of
  digits, and moves in the game. It needs its own decision record.
- Nothing a child types is ever shown to anyone else.

## Honest mechanics

- No real money, and no way to buy coins, packs or cards.
- Coins come from play. Their price list is fixed and shown.
- Pack odds are stated on the pack: 7 base, 2 rare, 1 legend.
- No pressure to keep playing or to come back: no streak that resets, no
  countdown, no "last chance", no notification.
- No reward for sharing the site or inviting a friend.
- A child can always stop. Progress is saved after every action.
- Losing is gentle. Messages encourage and never mock.

## Content

- Words are short, plain and kind. Aim at a reader aged seven.
- Player facts are neutral: football only. Nothing about a player's private
  life, injuries beyond the plain fact, betting, alcohol or sponsors.
- Photos show the player in a football setting. See `game-data-api`.
- No sponsor names or betting brands in text the project writes. A shirt in
  a licensed photo may show one, and the pipeline prefers a photo without.
- No link leaves the site, except the photo credits to Wikimedia Commons on
  the credits page, which is for adults and says so.

## For the adult

- One short page says, in plain words, what the site stores and where: game
  progress, on this device, and nothing else.
- "Start again" deletes everything the site stored. It asks once first.
- The page names how to contact the person who runs the site, with the
  address the tech lead supplies.

## How it is checked

- The Content Security Policy allows the site's origin only.
- An end-to-end test fails on any request to another host or any cookie.
- A lint rule refuses storage and network calls outside their one module.
- The reviewer checks this list on any task this skill's description
  covers, and a break is a `must_fix`.
