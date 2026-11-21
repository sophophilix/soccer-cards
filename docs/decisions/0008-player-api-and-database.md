# ADR 0008: A player API and database on Cloudflare serverless

> Status: In review
> Created: 2026-11-21T14:27:52Z
> Last reviewed: 2026-11-21T14:27:52Z
> Next review: Not scheduled

## Review guide

Decision requested: add a read-only player API on a Cloudflare Worker, backed
by a Cloudflare D1 database that only the data pipeline writes, with an
OpenAPI description and an MCP server for AI agents, as `/api/v2`. The website
stays as it is and reads its data from the API.

Check these points:

- [ ] D1 and D2: the API answers on the site's own address, so the security
      policy, privacy rules and "no other host" rule don't change.
- [ ] D4: only the pipeline writes the database; the API can only read.
- [ ] D6: the scope is professional players with a public record: top clubs
      and leagues, national teams including the Socceroos and Matildas, and
      the A-League including Western Sydney Wanderers.
- [ ] D8: `v1` keeps working until the site has moved to `v2`.
- [ ] The open item: how ratings are made for thousands of players waits for
      the free-tier sports API research.

Respond with `approve`, `approve with follow-up: <action>` or
`request changes: <specific issue>`.

## Summary

The tech lead wants every professional player worth collecting, not 24, and
"a proper db and api" that is modern and easy for AI agents to use, while the
website stays as it is (2026-11-21). They chose Cloudflare serverless. Today
the API is a folder of JSON files the pipeline writes and the site serves (ADR
0005 D8). That list is one file capped at 1,000 players and can't page. This
record adds a database and a real API without giving up what the static design
protects: no other host, no personal data, no accounts and nothing to write to.

## Context

- ADR 0002 hosts the site on Cloudflare Workers with static assets, managed by
  OpenTofu, with logs and analytics off (D10).
- ADR 0003 keeps every request on the site's own origin and collects no
  personal data. ADR 0005 sets the API's design rules (Google's AIPs, resource
  names such as `players/lionel-messi`, `v1` and how it may change).
- ADR 0006 sets how ratings are made, and D4 who is an Icon.
- The site is free forever, with no ads, donations or paid packs (tech lead,
  2026-11-21).

## Decisions

**D1. Three tiers.**

| Tier     | What it is                                                              | Writes                 |
| -------- | ----------------------------------------------------------------------- | ---------------------- |
| Website  | The SvelteKit site, unchanged in look; reads from the API               | nothing                |
| API      | A Cloudflare Worker answering `/api/v2/*` on `soccercards.dsantmaj.com` | nothing                |
| Database | Cloudflare D1, one database for the player data                         | the data pipeline only |

**D2. The API lives on the site's own address.** A Worker route serves
`/api/v2/*` next to the static site. The site's content security policy keeps
`connect-src 'self'`, no cross-origin request is made, and no CORS header is
needed. The `v1` static files keep being served as they are (D8).

**D3. The API follows ADR 0005 and pages its lists.** Resources keep their
names and ids. `v2` adds the collections the larger set needs and the AIP
methods a static file couldn't offer:

- `GET /api/v2/players`, `/clubs`, `/leagues`, `/national-teams`, with
  `page_size` and `page_token` (AIP-158), `filter` on documented fields such
  as `league`, `club`, `nationalTeam`, `tier` and `position` (AIP-160), and
  `order_by` (AIP-132).
- `GET /api/v2/players/{player}` and the same for each collection.
- `GET /api/v2/clubs/{club}/players` and
  `/api/v2/national-teams/{team}/players` for squads.
- Every response is JSON with a strong `ETag` and `Cache-Control`, so the
  edge caches it and the site's service worker can keep it for offline play.
- Errors follow [AIP-193](https://google.aip.dev/193): one JSON error shape with a
  code, a message a person can read and a stable reason. ADR 0005 left errors
  out because a static API has none.

**D4. The API can only read.** The Worker runs only `SELECT` statements,
prepared with bound parameters, through a small query layer that has no write
method. The only way data enters D1 is the pipeline's publish job in CI,
using a Cloudflare token scoped to this database. A rate-limit rule on
`/api/*` protects the free plan's quotas.

**D5. Built for AI agents.**

- `GET /api/v2/openapi.json`: an OpenAPI 3.1 description generated from the
  JSON Schemas in `packages/schema`, so the code, the checks and the
  description can't drift apart.
- An MCP server as a second Worker with read-only tools (`search_players`,
  `get_player`, `list_squad`, `get_club`), calling the same query layer.
- `/llms.txt` describing the API, its resources and its rules in plain text.
- Stable ids, documented enumerations and consistent errors, as ADR 0005
  already requires.

**D6. Who is in it.** Professional players with a public record (a Wikidata
item), in waves, each reviewed before it's published:

1. The top five European leagues.
2. Other major leagues and the men's and women's national teams, including
   the Socceroos and the Matildas.
3. The A-League Men and Women, including Western Sydney Wanderers, and the
   rest of the world.

No amateur, community or youth players: they are private people, and some
are children (ADR 0003). Photos still come only from Wikimedia Commons under
a free licence, with credit, or the kit avatar.

**D7. The pipeline writes the database.** `scdata` keeps every check it has
(schema, licences, our own ratings, formula version) and gains a publish step
that writes a run's results to D1 in one transaction, so the API never shows a
half-written run. One player that fails a check is set aside and reported; the
rest of the run still publishes. Each fact keeps its source and the date it
was read.

**D8. Moving from `v1` to `v2`.** `v2` is a new major version (ADR 0005 D9).
The site moves to `v2` screen by screen. `v1` stays until the site no longer
reads it and the tech lead retires it.

**D9. Infrastructure is code.** The D1 database, the Worker routes, the MCP
Worker and the rate-limit rule are OpenTofu resources in `infra/`, planned in
CI and applied by the tech lead (ADR 0002). Worker logs stay off (ADR 0002 D10).

## Open item

**Ratings at scale.** ADR 0006 grades each player's skills by hand with a
reason. That doesn't scale to thousands. A research task is reading the terms
of three free-tier sports APIs (Football-Data.org, API-Football, TheSportsDB)
to see whether their statistics may be stored and used for our own ratings on
a public site. The method is decided in a follow-up to ADR 0006 once that
report is in.

## Consequences

- A new Worker package (`apps/api`) in TypeScript, and an MCP Worker. New
  packages for them go in their briefs.
- Infrastructure work for the tech lead to approve and apply.
- The site's data loaders change from files to API calls, screen by screen.
- More players means more photos to check for licences, and more grades.
- The OpenAPI file becomes part of the contract the schema checks guard.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-21T14:27:52Z | Drafted  | From the tech lead's answers on 2026-11-21: "we do need to build a proper db and api", "the website still can be how it is it just pulls all the data from an api... it needs to be the modern tht is AI agent appropriate", Cloudflare serverless chosen, and the player scope including the Socceroos, Matildas and Western Sydney Wanderers. |
