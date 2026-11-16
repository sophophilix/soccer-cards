# Third-party material

This file records what the project takes from elsewhere, under which terms,
and who checked it. Add a row before the material enters the repository.

## Photos

Player photos come from Wikimedia Commons under the rules in ADR 0003. The
record for each photo (file, author, licence) is in
`prototype/photos/credits.json` for the prototype, and will be in
`data/api/v1/credits.json` for the site.

The 36 prototype photos were fetched on 2026-11-15 by
`prototype/tools/fetch_photos.py`. Their licences are CC BY-SA 4.0,
CC BY-SA 3.0 AT, CC BY 4.0, CC BY 3.0 and public domain. No person has
checked each Commons page by hand.

## Prototype data

Player ratings, goals, transfer fees and awards in the prototype were
written from memory by Claude. They are sample values, not sourced facts,
and must not be carried into `data/`.

## Fonts

The prototype loads Bowlby One, Figtree and Saira Condensed from Google
Fonts. The site must serve its fonts from its own origin (ADR 0003 D5). The
licence of each font must be checked and recorded here before then.

## Agent plugins proposed, not installed

| Plugin | Source | Licence | Status |
|---|---|---|---|
| Svelte: MCP server, Svelte 5 skills, a Svelte file agent | `sveltejs/ai-tools` | MIT | Proposed in ADR 0004 D9. Not read, not installed |
| Cloudflare: 22 skills and an MCP server | `cloudflare/skills` | Apache-2.0 | Proposed in ADR 0004 D9. Not read, not installed |

Before installing one, the tech lead reads its skills, hooks and MCP
configuration, and records the version and the date here.

## Agent skills in use

| Skill set | Source | Licence |
|---|---|---|
| `python-standards`, `python-style-guide`, `python-testing`, `python-architecture`, `python-review`, `technical-writing`, `humanizer` | `sophophilix/agent-skills` | MIT. `humanizer` and `ste-lint.py` keep their own notices there |

## Practices drawn on

The skills restate practice from these sources in the project's own words.
No text was copied. The research record lists what was read and when.

- Claude Code documentation (hooks, subagents, skills, best practices)
- Svelte and SvelteKit documentation
- pnpm, Vitest and Playwright documentation
- GitHub Actions security documentation
- Google engineering practices for code review
- The `ai-code-audit` repository's rules, hook design and CI workflow
