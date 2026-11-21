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

## Player facts

| Source   | Terms | Terms page                                       | Read on    |
| -------- | ----- | ------------------------------------------------ | ---------- |
| Wikidata | CC0   | https://www.wikidata.org/wiki/Wikidata:Licensing | 2026-11-21 |

## Prototype data

Player ratings, goals, transfer fees and awards in the prototype were
written from memory by Claude. They are sample values, not sourced facts,
and must not be carried into `data/`.

## Fonts

The prototype loads its three fonts from Google Fonts. The site serves the
same fonts from its own origin (ADR 0003 D5). The build copies the WOFF2
files out of the Fontsource packages below, and
`apps/web/src/lib/ui/fonts.css` names each file.

| Font            | Author                                     | Licence                   | Package                              | Files the site ships                                                         |
| --------------- | ------------------------------------------ | ------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Bowlby One      | Vernon Adams                               | SIL Open Font License 1.1 | `@fontsource/bowlby-one` 5.3.0       | Latin, weight 400                                                            |
| Saira Condensed | The Saira Project Authors (Omnibus-Type)   | SIL Open Font License 1.1 | `@fontsource/saira-condensed` 5.3.0  | Latin and Latin Extended, weights 600 and 800                                |
| Figtree         | The Figtree Project Authors (Erik Kennedy) | SIL Open Font License 1.1 | `@fontsource-variable/figtree` 5.3.0 | Latin and Latin Extended, one variable file each, used at weights 400 to 700 |

The author and the licence are from the `LICENSE` file in each package,
read on 2026-11-19. Bowlby One, Bowlby, Bowlby One SC and Saira are
reserved font names, so a changed copy of those fonts must take another
name. The site ships the files unchanged. No person has checked the
licences by hand.

## JavaScript packages

The site's runtime and build packages beyond the fonts above. The licence is
the `license` field the npm registry returns for that exact version, read on
2026-11-21T14:12:31Z. A licence that only links to its terms says so.

| Package             | Version | Licence                                          | Licence terms                                                 | Terms read                    |
| ------------------- | ------- | ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------- |
| `gsap`              | 3.15.1  | GSAP Standard no-charge licence, not open source | https://gsap.com/standard-license                             | 2026-11-21T13:50:05Z          |
| `tailwindcss`       | 4.3.5   | MIT                                              | https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE | Not read, registry field only |
| `@tailwindcss/vite` | 4.3.5   | MIT                                              | https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE | Not read, registry field only |

The registry field for `gsap` only links to its terms. The terms, read on
2026-11-21T13:50:05Z and recorded in ADR 0007 D3, are effective 2025-04-30
and last modified 2025-05-30. They allow any website or app, commercial use
included. They forbid a no-code animation builder that competes with Webflow
and the removal of proprietary notices. Webflow may revise them, so a version
released later needs a new read. No person has checked the Tailwind licence
files by hand.

## Agent plugins proposed, not installed

| Plugin                                                   | Source              | Licence    | Status                                           |
| -------------------------------------------------------- | ------------------- | ---------- | ------------------------------------------------ |
| Svelte: MCP server, Svelte 5 skills, a Svelte file agent | `sveltejs/ai-tools` | MIT        | Proposed in ADR 0004 D9. Not read, not installed |
| Cloudflare: 22 skills and an MCP server                  | `cloudflare/skills` | Apache-2.0 | Proposed in ADR 0004 D9. Not read, not installed |

Before installing one, the tech lead reads its skills, hooks and MCP
configuration, and records the version and the date here.

## Agent plugin skill in use

| Plugin skill                      | Source                                                               | Licence as published | Version | Read on              |
| --------------------------------- | -------------------------------------------------------------------- | -------------------- | ------- | -------------------- |
| `frontend-design:frontend-design` | Anthropic, the `frontend-design` plugin in `claude-plugins-official` | Apache-2.0           | 1.1.1   | 2026-11-21T14:12:28Z |

The licence is from the `LICENSE` file in the installed plugin. The web
implementer loads the skill. It guides design work and adds no package to the
site.

## Agent skills in use

| Skill set                                                                                                                            | Source                     | Licence                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------- |
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
