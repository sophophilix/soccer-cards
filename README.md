# Soccer Cards

A card game for children, played in the browser. Open packs of football
player cards, flip them to see their stats, build a team and play matches.
Progress stays on the device. The site collects no personal data, shows no
ads and has no accounts or chat.

Address: <https://soccercards.dsantmaj.com> (live once the hosting tasks
T-0058 to T-0060 are deployed).

## What's here

| Path | Holds |
|---|---|
| `apps/web` | The SvelteKit site: cards, packs, team, matches |
| `packages/game` | The game rules as plain TypeScript: packs, divisions, matches |
| `packages/schema` | The JSON Schema for the player data the site reads |
| `infra` | OpenTofu for the custom domain on Cloudflare |
| `prototype` | The approved look and rules, as one HTML file |
| `docs/decisions` | Architecture decision records. Start with 0001 and 0004 |
| `docs/tasks` | One brief for each change |
| `docs/how-to` | One-time setup, such as hosting |
| `tools/sdlc`, `bin/sdlc` | The delivery kit that checks every change |

## Run it

You need Node.js, pnpm and GNU Make.

```sh
pnpm install
make dev        # the site with hot reload
make preview    # the production build, served as Cloudflare serves it
make e2e        # the end-to-end tests against that build
```

## Check a change

```sh
make check COMPONENT=web   # or game, schema, infra, ci, docs, sdlc
make check-all
```

CI runs the same commands on every pull request, plus security scans.

## How changes land

Work is planned as small task briefs in `docs/tasks/` and built on
branches, often by AI agents under the rules in [AGENTS.md](AGENTS.md).
Every change lands through a pull request whose checks pass. A merge to
`main` deploys to Cloudflare Workers only after the tech lead approves it.
ADR 0004 explains the process and what the kit enforces.

## Hosting

Cloudflare Workers serves the static site. OpenTofu attaches the custom
domain, with its state in Azure. Both are deployed from CI, never from a
laptop. See ADR 0002 and [the setup guide](docs/how-to/set-up-hosting.md).

## Content and licences

Player photos come from Wikimedia Commons with their credits, and ratings
are computed by this project's own formula. The game uses no club crests,
league logos or trading card designs. See ADR 0003 and
[THIRD_PARTY.md](THIRD_PARTY.md).

The code is under the [MIT licence](LICENSE).
