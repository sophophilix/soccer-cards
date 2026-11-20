# ADR 0006: Data pipeline and ratings

> Status: Approved
> Created: 2026-11-20
> Last reviewed: 2026-11-20T14:26:35Z
> Next review: Not scheduled

## Review guide

Decision requested: accept how the pipeline gets player facts, how a card's
ratings are made from them, and how the pipeline is built and checked.

Check these points:

- [ ] D2: skill grades of 1 to 5, drafted by an agent with a reason each and
      checked by a second agent, are the only facts set by hand. Players'
      feedback corrects them.
- [ ] D3: real statistics move a rating by a bounded amount, so a grade can't
      be outweighed by one unusual season.
- [ ] D6: the first runs are started by you, not on a schedule.

Respond with `approve`, `approve with follow-up: <action>` or
`request changes: <specific issue>`.

## Summary

The pipeline reads public facts from Wikidata and photos from Wikimedia
Commons, adds a small file of skill grades that the tech lead reviews, and
computes every number on a card with this project's own formula. No third
party's ratings are used (ADR 0003 D1).

## Context

- ADR 0001 D1 and D5: a Python pipeline under `data/pipeline/` writes
  `data/api/v1/`, which is committed. ADR 0003: sources, photos and the
  User-Agent. ADR 0005: the API shape, the two rating groups and the 1 to 99
  range.
- Wikidata has the facts a card needs: position, clubs with appearances and
  goals, national team caps and goals, honours and dates. It has no skill
  facts such as pace or passing, and no source with allowed terms does.
- A model asked for 1 to 99 ratings tends to reproduce a video game's
  numbers from memory. That would break ADR 0003 D1.
- On 2026-11-20 the tech lead agreed: Wikidata statistics and honours, plus
  1 to 5 skill grades an agent drafts with reasons, through the project's
  formula. They chose not to review grades one by one, and to correct them
  from their children's feedback after release. The User-Agent contact is the repository
  address.

## Decision

**D1. Sources.**

| Source | Terms | Gives |
|---|---|---|
| Wikidata, through its SPARQL endpoint and entity data | CC0 | Name, birth date, position, clubs with appearances and goals, national team with caps and goals, honours |
| Wikimedia Commons | Per file (ADR 0003 D2) | Photos, with author and licence |
| `data/pipeline/grades/` | This project | Skill grades (D2) and tier overrides (D4) |

Each request sends `User-Agent: SoccerCardsDataPipeline/<version>
(https://github.com/sophophilix/soccer-cards)`. Requests to a host go one at
a time, with a timeout, back-off on HTTP 429 and `Retry-After`, and an
on-disk cache.

**D2. Skill grades.** For each player a committed file holds six grades from
1 to 5, one for each rating in the player's group (ADR 0005 D6), and a
one-line reason for each that names a public, checkable fact. An agent
drafts grades, and a reviewer agent checks every reason in the pull request.
The tech lead doesn't review grades one by one: the cards ship, and the
players' feedback, passed on by the tech lead, corrects a grade through a
normal pull request. A grade file never holds a number on the 1 to 99 scale,
and never cites a video game or a card maker.

**D3. The formula.** One module, with a version number and named constants:

- Each rating starts from its grade: grade 1 gives the lowest base and
  grade 5 the highest, evenly spaced inside 1 to 99.
- Statistics adjust a rating by at most a fixed bound in either direction,
  and only the ratings they say something about: goals per appearance for
  shooting, appearances and caps for the overall level, age for pace and
  physical. Honours raise no single rating.
- Results are rounded and clamped to whole numbers from 1 to 99.
- `attack`, `defence`, `control` and `overall` are weighted means of the six
  ratings, with weights per position.

The formula's version is written into `index.json`. Changing it changes the
version and shows the before and after for every player in the pull request
(the `game-data-api` skill).

**D4. Tiers.** By rule on `overall`: `LEGEND` from 88, `RARE` from 84, `BASE`
below. Honours count only through overrides: a file lists a player, a tier
and a reason, and a reviewer agent checks each line. `ICON` is given only by
override, to retired greats, so the pack rules always have at least one
Icon card.

**D5. Build.** `data/pipeline/` is one uv project with a `src` layout, under
the team's `python-standards`, `python-style-guide` and `python-testing`
skills. The stages are those in the `game-data-api` skill: fetch, normalise,
licence check, rate, validate, write. Every stage but fetch is a pure
function of files. No test reaches the network. `make check
COMPONENT=data` runs ruff, ruff format, mypy (strict), bandit and pytest
through `uv run --frozen`.

**D6. Running it.** An agent or the tech lead runs the pipeline and commits
the output through a reviewed pull request. A run makes few, sequential
requests with the D1 User-Agent. A scheduled CI run that opens the pull
request itself comes later, with its own decision.

## Consequences

- Every number on a card can be traced to a grade and its reason, a fact
  with its source, and a formula version.
- Adding a player costs one reviewed grade entry.
- Two players with the same grades and similar records get similar cards.
  The grades carry the judgement; the statistics only adjust it.

## Rejected

- **Ratings copied from a game or a card database.** Their terms and ADR
  0003 D1 forbid it.
- **1 to 99 grades written by a model.** Too close to reproducing a game's
  ratings.
- **Statistics alone.** Goals and appearances can't tell a fast winger from
  a target forward, so every player of a position would look alike.

## Risks and open items

- Wikidata's appearance and goal qualifiers are missing or stale for some
  players. The pipeline must treat a missing fact as absent (ADR 0005), and
  the formula must still give a rating from the grade alone.
- The formula's constants need a first calibration on a small, well-known
  set of players before more are added.
- Retired players' and goalkeepers' facts are thinner; their grades carry
  more weight.

## Review history

| Reviewed at | Decision | Notes |
|---|---|---|
| 2026-11-20 | Proposed | Drafted by Claude after the tech lead said "yes to the ratings approach, go ahead". |
| 2026-11-20T13:09:36Z | Approved | The tech lead said "yes to the ratings approach, go ahead", then "i dont think i can review these ... 1-5 skill grades ..., just deploy them and my kids will feedback". D2 now has a reviewer agent check grades, and feedback corrects them after release. |
| 2026-11-20T14:26:35Z | Amended | The tech lead chose "By listed override (Recommended)" for `ICON` (D4) and "Agent runs it (Recommended)" for the pipeline runs (D6). |
