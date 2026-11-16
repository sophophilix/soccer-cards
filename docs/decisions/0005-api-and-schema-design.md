# 0005: API and schema design

> Status: Approved
> Created: 2026-11-16T12:06:57Z
> Last reviewed: 2026-11-16T12:08:46Z
> Next review: Not scheduled

## Review guide

Decision requested: adopt Google's API Improvement Proposals (AIPs) as the
design guide for the player API and its schemas, with the named exceptions.

Check these points:

- [ ] D2: a player's id becomes a readable slug such as `lionel-messi`, not
      a number.
- [ ] D6: goalkeepers get their own six ratings, and every player keeps the
      three play stats.
- [ ] D7: the national team uses the FIFA code, because England, Scotland
      and Wales have no standard region code.
- [ ] D10: a program checks the rules and refuses a breaking change.
- [ ] "What changes in work already done" is acceptable.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

The tech lead asked for goalkeepers and for an API and schema design that
follows Google's or Microsoft's design guide. This record picks Google's
AIPs as the main guide, because they are built around resources and
collections, which is what a folder of JSON files is. It takes three JSON
rules from Microsoft's Azure REST API guidelines, where the AIPs describe
Protocol Buffers and say little about JSON.

The design changes the schema drafted in T-0002. Nothing is published yet,
so the changes cost nothing to a client today. After the first deploy the
contract is frozen under D9.

## Evidence

Read on 2026-11-16 from the primary sources:

| Source                                                                                                  | Used for |
| ------------------------------------------------------------------------------------------------------- | -------- |
| [AIP-122, resource names](https://google.aip.dev/122)                                                   | D2, D3   |
| [AIP-126, enumerations](https://google.aip.dev/126)                                                     | D5       |
| [AIP-140, field names](https://google.aip.dev/140)                                                      | D4       |
| [AIP-141, quantities](https://google.aip.dev/141)                                                       | D4, D7   |
| [AIP-142, time and duration](https://google.aip.dev/142)                                                | D7       |
| [AIP-143, standardized codes](https://google.aip.dev/143)                                               | D7       |
| [AIP-148, standard fields](https://google.aip.dev/148)                                                  | D3       |
| [AIP-180, backwards compatibility](https://google.aip.dev/180)                                          | D9       |
| [AIP-185, versioning](https://google.aip.dev/185)                                                       | D9       |
| [`google.type.Money`](https://github.com/googleapis/googleapis/blob/master/google/type/money.proto)     | D7       |
| [Azure REST API guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) | D4, D5   |

Not read today, and used from memory. Each needs a check before the task
that depends on it:

- AIP-131 and AIP-132 (the standard Get and List methods) and AIP-158
  (pagination), for D8.
- AIP-216 (resource states), for the `state` field in D3.
- That Protocol Buffers' JSON form writes a 64-bit integer as a string,
  for the exception in D7.

Facts that shaped the decision:

- AIP-122: a resource has a string `name` field holding its resource name,
  and no other field may be called `name`. Collection ids are plural and
  camelCase. A user-chosen id uses lowercase letters, digits and hyphens,
  starts with a letter and has at most 63 characters.
- AIP-148: a person's names are `given_name` and `family_name`, and a label
  for people to read is `display_name`.
- AIP-143: use a standard code instead of an enumeration. A country is a
  Unicode CLDR region code in `region_code`. A currency is ISO 4217 in
  `currency_code`.
- AIP-180: removing or renaming a field, changing a type, changing a
  resource name's format and changing a default are breaking. Adding a
  field or an enumeration value is not, but a client must be told that new
  values can appear.
- Azure guidelines: JSON names are camelCase, a field is never sent as
  `null`, and an enumeration is extensible unless its values can never
  change.

## Decision

**D1. Google's AIPs are the design guide.** Where an AIP speaks only about
Protocol Buffers, the Azure guidelines' JSON rules apply: camelCase names,
no `null`, extensible enumerations. A rule this record doesn't state comes
from the AIP for that topic. An exception to an AIP is written here with
its reason.

**D2. Resources and their names.** The API has three resources.

| Resource | Name pattern         | Example                |
| -------- | -------------------- | ---------------------- |
| Player   | `players/{player}`   | `players/lionel-messi` |
| Club     | `clubs/{club}`       | `clubs/real-madrid`    |
| Edition  | `editions/{edition}` | `editions/2026`        |

An id is a slug: lowercase ASCII letters, digits and hyphens, starting with
a letter, 63 characters at most. Two people with one name get a birth year,
as in `ronaldo-1976`. An id is never reused and never changed. One resource
points to another by its resource name, never by a copy of its data.

`packages/game` already uses a string id, so the player segment of the name
is the game's card id with no conversion. The number printed on a card is a
separate field, `cardNumber`.

**D3. Standard fields.** Every resource has `name` first. A player has
`displayName`, and `givenName` and `familyName` where the player has both.
Every resource has `updateTime`, which changes only when its content
changes. A player has `state`, with `ACTIVE` or `RETIRED`.

**D4. Field names.**

- lowerCamelCase, with no capitalised acronyms: `sourceUri`, not
  `sourceURI`.
- Nouns, with no prepositions and no `is` prefix on a true or false field.
- A list has a plural name.
- A count ends in `Count`: `clubGoalCount`, not `clubGoals` or `numGoals`.
- A measured value names its unit: `widthPx`.
- `uri` for a link, `...Time` for a moment, `...Date` for a calendar day,
  `...Code` for a standard code.

**D5. Enumerations.** Values are UPPER_SNAKE_CASE strings. Each is
extensible: the schema lists today's values, and a reader must treat a
value it doesn't know as unknown, not as an error. No `..._UNSPECIFIED`
value is written. That value exists for Protocol Buffers' zero default, and
in this API an unknown value is an absent field.

| Field      | Values                                            |
| ---------- | ------------------------------------------------- |
| `tier`     | `BASE`, `RARE`, `LEGEND`                          |
| `position` | `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD` |
| `state`    | `ACTIVE`, `RETIRED`                               |

**D6. Goalkeepers.** A player has exactly one of two rating groups, chosen
by `position`:

- `outfieldRatings`: `pace`, `shooting`, `passing`, `dribbling`,
  `defending`, `physical`.
- `goalkeeperRatings`: `diving`, `handling`, `kicking`, `reflexes`, `speed`,
  `positioning`.

Every player has the same `playStats`, `attack`, `defence` and `control`,
so the game rules treat every card alike. The ratings formula has one rule
per group. All ratings and play stats are whole numbers from 1 to 99.

**D7. Types and codes.**

- **Country.** `nationalTeamCode` holds the FIFA three-letter code, such as
  `ENG`. This is an exception to AIP-143. CLDR has no region code for
  England, Scotland or Wales, and those are the teams a card shows.
- **Money.** The shape of `google.type.Money`: `currencyCode` (ISO 4217),
  `units` and `nanos`. `units` is a JSON whole number, not a string. This
  is an exception to the Protocol Buffers JSON form. No fee comes near the
  limit of a JSON number, and a number is what a reader expects.
- **Moments.** RFC 3339 in UTC, as in `2026-11-16T12:06:57Z`.
- **Days.** `YYYY-MM-DD`. When only a year is known, the field is a year:
  `careerStartYear`, `careerEndYear`.
- **Photo.** An object with `uri` (a path inside the API), `widthPx`,
  `heightPx`, `mimeType` and `attribution`. The attribution has `author`,
  `licenseCode` (an SPDX id such as `CC-BY-SA-4.0`) and `sourceUri`.
- **Where a fact came from.** A fact that changes over time is an object
  with its value, `sourceUri` and `retrieveDate`.
- **Unknown.** An unknown value is absent. `null`, `0` and `"unknown"` are
  never written in its place.

**D8. Files map to the standard methods.**

| File                                | Method    | Body                                                           |
| ----------------------------------- | --------- | -------------------------------------------------------------- |
| `v1/index.json`                     | Discovery | The collections, the schema ids, `dataVersion`, `generateTime` |
| `v1/players.json`                   | List      | `{ "players": [...] }`, each a summary                         |
| `v1/players/{player}.json`          | Get       | One full player                                                |
| `v1/clubs.json`, `v1/editions.json` | List      | The same shape                                                 |
| `v1/credits.json`                   | List      | Every photo's attribution                                      |

A summary holds a fixed subset of a player's fields, enough to draw a card
front. The list is one file and is not paginated. This is an exception to
the AIP rule that a list is paginated from the start. A static file can't
take a page token, and the schema caps the list at 1,000 players. A set
beyond that needs a new major version.

**D9. Versioning and compatibility.** The path carries the major version
only: `v1`. Until the first public deploy the contract may change freely.
From that deploy:

- Adding an optional field, a resource or an enumeration value is allowed.
- Removing or renaming a field, changing a type, changing an id's format,
  making an optional field required and changing a field's meaning are
  breaking. A breaking change needs `v2` and a decision record.
- `v1` stays until the tech lead retires it.

**D10. A program checks the design.** Three checks run in the `schema`
gate, so the rules don't depend on a reviewer's memory.

1. **Design lint.** A test reads every schema and fails on: a property name
   that isn't lowerCamelCase, a `name` property that isn't the resource
   name, an enumeration value that isn't UPPER_SNAKE_CASE, a type that
   allows `null`, a property with no description, and a field name that
   breaks the suffix rules in D4.
2. **Compatibility.** A test compares each schema with the copy from the
   last release and fails on any change that D9 calls breaking.
3. **Examples.** A valid example of each resource is kept beside its schema
   and checked against it. The examples are invented players.

The pipeline's validate stage checks what a schema can't: ids are unique,
every reference points to a resource that exists, and a player has the
rating group that matches the position.

## What changes in work already done

- **T-0002 (pull request 5).** Its package, type generation and tests stay.
  Its schema content changes: the numeric `id` becomes `name`, `name`
  becomes `displayName`, `country` becomes `nationalTeamCode`, positions
  and tiers change to D5, the fee changes to D7, and `source` and `asOf`
  become `sourceUri` and `retrieveDate`. Merge it as it is, and make these
  changes in new tasks.
- **T-0003 (pull request 4).** No change. The game package keeps its own
  lowercase tier names. The app converts where it loads the data.
- **The `game-data-api` skill.** Its field rules move to match this record.

## Consequences

- A client can learn the whole API from `index.json` and the schemas.
- The card id is readable in a saved collection and in a link.
- A design mistake fails a test before review.
- The schema is larger, and the summary repeats some of the full player's
  fields.
- The app needs a small conversion from the API's values to the game's.

## Rejected

- **Microsoft's guidelines as the main guide.** They are written for
  services that accept requests. Most of their rules cover verbs, headers,
  errors and long-running operations, which a static API doesn't have.
- **A numeric id.** It is shorter, and it says nothing in a diff or a
  saved game. It also invites reuse when a player leaves the set.
- **One rating group with empty fields for goalkeepers.** It breaks the
  rule that an unknown value is absent, and a reader can't tell "not
  applicable" from "not known".
- **JSON:API or GraphQL.** Each needs a server or a client library. The
  files are read with one `fetch`.

## Risks and open items

- **A fourth tier.** The prototype on the tech lead's machine has an
  `ICON` tier for retired greats. The tech lead has not yet chosen whether
  to keep it. D5 makes it an added value, which is not breaking.
- **The overall rating.** The same prototype shows one overall number on
  the card front. If it stays, `playStats` gains an `overall` field.
- **Facts read from memory.** The three items under "Evidence" need a check
  against the source.
- **The compatibility check needs a first release to compare with.** Until
  the first deploy it has nothing to do.
- **Ratings for retired players and goalkeepers** need inputs from allowed
  sources. The data pipeline plan must name them.
- **An OpenAPI description** of the files would give readable reference
  pages. It is not decided here.
- **A local MCP server comes after the API.** The tech lead decided "api
  first then local mcp later". It reads these same files on the tech lead's
  machine, with read-only tools, and needs its own plan. A hosted MCP
  server would add server code to the site and needs a decision record.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-11-16T12:06:57Z | Drafted  | Written by Claude at the tech lead's request for goalkeepers and a design that follows Google's or Microsoft's guide. |
| 2026-11-16T12:08:46Z | Approved | The tech lead replied "approve, api first then local mcp later" in the lead session. |
