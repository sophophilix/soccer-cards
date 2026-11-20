# Soccer Cards

@AGENTS.md

## Commands

- Check one component: `make check COMPONENT=<web|game|schema|data|infra|ci|docs|sdlc>`
- Check everything: `make check-all`
- Check the working tree against the active task: `bin/sdlc verify`
- Validate a task brief: `bin/sdlc task-check docs/tasks/T-0001-<slug>.md`

## Where things are

- Decisions: `docs/decisions/` (start with 0001 and 0004)
- Task briefs: `docs/tasks/`, from `docs/tasks/TEMPLATE.md`
- The approved look and game rules: `prototype/soccer-cards-prototype.html`
- Agent run state, never committed: `.sdlc/`

## Skills from maintainers

- Svelte code: the `svelte` plugin's skills and its MCP server
  (`get-documentation`, `svelte-autofixer`).
- Python tooling: `/astral:uv` for dependencies and `/astral:ruff` for lint
  and format. The type gate is still mypy (`make check COMPONENT=data`).
- Never start the plugin's `svelte-file-editor` agent. Svelte work goes to
  `web-implementer` (ADR 0004 D13).

## Working here

- In the main session you are the lead. Use the `delivery-lead` skill for any
  change to product code. Don't write product code yourself.
- The tech lead is the person you are talking to. Ask them for anything rule 1
  reserves.
