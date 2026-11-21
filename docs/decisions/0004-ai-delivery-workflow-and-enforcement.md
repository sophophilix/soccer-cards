# ADR 0004: AI delivery workflow, and what a program enforces

> Status: Approved
> Created: 2026-11-15T11:16:22Z
> Last reviewed: 2026-11-21T20:51:24Z
> Next review: after the first five tasks delivered under this workflow

## Review guide

Decision requested: accept the roles, the task contract and the enforced
checks below as the way every change to this repository is made.

Check these points:

- [ ] The list of refused shell commands in D5 is not too wide for agents to
      do their work, and not too narrow for you.
- [ ] 400 changed lines is the right ceiling for one task (D3).
- [ ] Sending an agent back once, then leaving the decision to the lead and
      CI (D5), is the right limit.
- [ ] You will read the Svelte and Cloudflare plugins before installing them
      (D9).

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

A lead session splits work into small task briefs. A specialist agent builds
each one in its own worktree. A separate agent that never saw the build
reviews it. The tech lead approves and merges.

Wherever a rule can be checked by a program, a program checks it. The
program is `bin/sdlc`: Python, standard library only, with tests. A prompt
asks. A hook decides.

This kit governs how the product is built. The `ai-code-audit` kit is a
separate, independent check that runs on the product after it is built.

## Evidence

| Observation | Where |
|---|---|
| An instruction in `CLAUDE.md` or a skill is followed "nearly every time", and a hook or deny rule is applied every time | Claude Code best practices, in the research record |
| The same guide says to keep the enforced set small, because each rule sometimes fires when it shouldn't | Same |
| A subagent's tool list is enforced by the harness. A reviewer with no edit tools can't edit | Claude Code subagents reference |
| A reviewer asked to find problems always finds something | Claude Code best practices |
| Small changes are reviewed better. 100 lines is reasonable and 1,000 is too large. Refactoring belongs in its own change | Google engineering practices |
| Two agents editing one file overwrite each other | Claude Code agent teams page |
| `tools/sdlc/tests/test_sdlc.py` holds 40 tests of the kit's decisions, and they pass | `make check COMPONENT=sdlc` on 2026-11-15 |

## Decision

**D1. Roles.**

| Role | Who | Does | Never |
|---|---|---|---|
| Tech lead | The human | Approves decisions, merges, deploys, relaxes rules | |
| Lead | The main Claude Code session | Writes task briefs, starts agents, checks results, opens pull requests | Writes product code |
| Implementer | `web-implementer`, `data-implementer`, `infra-implementer` | Builds one task inside its paths, with tests | Reviews its own work |
| Reviewer | `reviewer`, `security-reviewer` | Reads the change and writes one review file | Edits the change |
| Refactorer | `refactorer` | Improves structure without changing behaviour | Changes tests or contracts |

**D2. The flow.** Each step leaves a file a program can check.

1. The tech lead states a goal. The lead writes one brief per task in
   `docs/tasks/`. `sdlc task-check` validates each brief.
2. The lead creates a branch and starts the brief's agent in a worktree.
3. The agent records its task in `.sdlc/active-task` and builds it. Hooks
   hold it to the task's paths and format each file it writes.
4. When the agent finishes, `sdlc verify` runs. A failure sends it back once.
5. The lead runs `sdlc verify` itself, then starts the reviewer. For a change
   that touches data handling, headers, dependencies, CI or infrastructure it
   also starts the security reviewer.
6. Each reviewer writes `.sdlc/reviews/<task>.json`. A hook checks the file.
7. The lead sends `must_fix` findings back to a new implementer run, at most
   twice. After that it stops and asks the tech lead.
8. The lead opens the pull request with the brief, the gate results and the
   review verdicts. CI runs every gate again.
9. The tech lead reviews, approves and merges.

**D3. The task brief is the contract.** A brief names its component, its
kind, its agent, the paths it may change, the packages it may add and its
size limit, and it has a goal, acceptance criteria, tests and an out-of-scope
list. The size limit is 400 changed lines and a brief can't raise it.

**D4. One command source, two scopes.** `make check COMPONENT=<name>` runs a
component's gates. The hooks, the lead and CI all call it, so a gate can't
pass in one place and fail in another. A gate that isn't configured fails.

- `SCOPE=full`, the default, runs every check and every test. CI uses it.
- `SCOPE=affected BASE=<ref>` runs the same static checks in full: format,
  lint, typecheck, Knip and the schema checks. It runs only the tests the
  change can reach, and it skips the coverage thresholds, which hold only
  for a full run. `sdlc verify` uses it.

Both scopes call the same targets and tools. The affected scope only
narrows the list of tests (D14).

**D5. What the hooks check.** They run from `.claude/settings.json`.

| Event | Check |
|---|---|
| Before a shell command | Each part of the command line is checked. Refused: `npm`, `npx`, `yarn`, `bun`, `pip` and `pnpm dlx`. Commits on `main`, pushes to `main`, force pushes and skipped hooks. `gh pr merge`, approvals and repository settings. `wrangler deploy`, `tofu apply` and similar. Reading a secret file. Piping into a shell. `sudo`. A shell write follows the file rules below |
| Before a file write | Nobody writes a secret file or a generated file. A subagent can't write the kit, and the main session is asked. An implementer writes only its task's paths. A reviewer writes only its review file |
| After a file write | Prettier and ESLint, or Ruff, run on the file when the project has them. Errors go back to the agent |
| When an implementer or the refactorer finishes | `sdlc verify`: paths, size, declared dependencies, tests with the change, the gate. Sent back once |
| When a reviewer finishes | The review file exists and is valid. Sent back once |

An agent is sent back once. Its second attempt to finish passes, and the
lead's own `sdlc verify` and CI then decide. A check an agent can't satisfy
would otherwise hold it until the harness gives up.

The shell check is a deny list. The audit kit uses an allow list because its
agents only read. Agents here must build and test, so the list of what they
may run can't be closed.

**D6. A broken hook refuses.** If the event can't be read or the check fails,
the hook exits with code 2, and the setting `onFailure: "block"` covers a
missing script or a timeout.

**D7. Review is independent and bounded.**

- The reviewer starts with a fresh context: the brief, the diff and the
  skills. It doesn't get the implementer's reasoning.
- It has no edit tools, and the hook limits its writes to the review file.
- It reviews against the brief and the skills' rules. Style is the linter's
  job. A finding without a rule is a suggestion and can't block.
- Its output is JSON with a fixed schema, so a program can check that the
  verdict follows from the findings and the gates.
- An agent's approval never merges anything. Rule 1 stands.

**D8. Refactoring is its own task type.** A program finds the candidates:
unused code, duplication, complexity and boundary breaks. The lead turns the
worthwhile ones into `kind: refactor` briefs. The refactorer may not change a
test, and the gate must pass before and after. A weekly scan is the default
schedule once code exists.

**D9. Third-party plugins.** The official Svelte and Cloudflare plugins are
proposed. A plugin's skills, hooks and MCP servers run with the user's
permissions, so the tech lead reads each one before installing it and records
the version in `THIRD_PARTY.md`.

**D10. Subagents, not agent teams.** Tasks here are independent and return a
result. Agent teams are experimental, cost more, and are for work that needs
discussion between agents.

**D11. Evaluation.** `evals/` defines four checks: the kit's own tests,
reviews of branches with planted defects, skill trigger and baseline runs,
and product budgets. Evaluations don't run on every commit. A change to
`.claude/skills/`, `.claude/agents/`, `AGENTS.md` or `tools/sdlc/` runs the
evaluations that cover it, and all of them run once a week and after a
model change. Only the kit's own tests are built today. They run in CI on
every pull request.

**D12. Every decision leaves a trace.** The kit appends one line to
`.sdlc/audit.jsonl` in the main checkout for each tool call it allows, asks
about or refuses, and for each `verify`, review check and agent finish. A
line has the UTC time, the task, the agent, the tool, the verdict and the
reason. A valid review file is copied to the main checkout, so it outlives
the agent's worktree. `bin/sdlc evidence <task-id>` prints a task's
refusals, checks, review files and run log lines, and the lead posts that
output as a comment on the task's pull request. The pull request is the
durable record. The comment never shows a shell command, because a command
can hold a secret and the repository is public. A log that can't be written
never changes a decision.

**D13. Skills follow shared responsibility.** A tool's maintainer owns the
skill for how to use that tool, and this project owns the skills for its own
rules, game, data and process. The Svelte team's `svelte` plugin
(`sveltejs/ai-tools`) and Astral's `astral` plugin (`astral-sh/agent-plugins`)
are enabled in `.claude/settings.json`, and the implementers and the reviewer
preload their skills. This project's skills keep only what is specific to
Soccer Cards. The type-check gate stays mypy, and `ty` is not a gate. The
lead starts only this team's agents (D1), never a plugin's agent.

**D14. Run each test where it earns its time.** A change runs the gates of
the components it touches, not every gate. One map in `tools/sdlc` places
each path in its components. `bin/sdlc changes` prints the result, and both
`sdlc verify` and CI's `changes` job read it. A path the map can't place
runs every gate.

| Where | What runs |
|---|---|
| Each file write | Format and lint of that file (D5) |
| `sdlc verify` | The touched components' gates, `SCOPE=affected` (D4) |
| A pull request in CI | The touched components' gates, `SCOPE=full` |
| A push to `main`, before a deploy | Every gate, `SCOPE=full` |
| Every night | Every gate, `SCOPE=full`, on `main` |
| A change to a skill, an agent or the kit | The evaluations that cover it (D11) |

The affected scope picks tests like this:

- **TypeScript unit tests**: Vitest's `--changed <base>`, which follows the
  import graph.
- **Playwright**: the changed spec files, plus the specs for each route
  folder that changed. A change to shared code, such as `src/lib/`, the
  styles, the configuration or a package the app imports, runs every spec.
- **Python**: each project's whole suite, only when that project changed.
  `data/pipeline` and `apps/api` are separate.
- **Kit, docs, workflows and infrastructure**: the whole gate, because each
  one is fast.

A gate result is recorded against the git tree it ran on. A later `sdlc
verify` on the same clean tree, scope and component reuses a pass and says
so. A reviewer or the lead running `verify` again on that tree doesn't run
the tests again. A failure is never reused, so a flaky test can be run
again. A tree with uncommitted changes never uses a recorded result.

Independent checks within a gate run in parallel.

## Consequences

- An agent that breaks a rule a program covers is stopped and reads why.
- A task can't grow without the lead writing a new brief.
- Every checked tool call starts Python once. Nobody has measured the cost
  over a working session.
- The hooks will sometimes refuse harmless commands. The first tasks will
  show how often.

## Rejected

- **Rules in prompts only.** They are followed almost every time, and the
  team wants the cases where "almost" fails.
- **A model-based hook as a gate.** It asks another model, so it isn't
  deterministic.
- **An allow list for shell commands.** Building software needs too many.
- **Letting the lead write product code.** It would review its own plan and
  its own code in one context.
- **YAML review files.** The standard library can't parse YAML, and the hook
  takes no dependencies. JSON carries the same fields as `python-review`.

## Risks and open items

- **The hooks have not run inside Claude Code yet.** Their decisions are
  tested as functions and through the command line. The first live session
  must confirm that `agent_type` arrives for subagents and that a worktree
  finds the kit.
- **This is not a sandbox.** An allowed program can write a file the hook
  never sees, for example through `python -c`. The diff, CI and the tech
  lead's review catch it.
- **The affected scope can miss a test (D14).** A Playwright spec reaches
  the app through the browser, not through imports. A change in one route
  folder can still break a screen whose specs the map didn't pick. The full
  run on each pull request, before each deploy and every night catches it.
  A miss found that way becomes a row in the map, with a test.
- **A recorded gate result is a local file (D14).** Like the audit log, an
  allowed program could edit it. CI never reads it.
- **The path check trusts `.sdlc/active-task`.** An agent names its own task.
  A wrong name fails `sdlc verify` later, not at once.
- **The Python skills are personal skills on the tech lead's machine.**
  Another contributor needs the `agent-skills` plugins installed for
  `data-implementer` to preload them.
- **Branch rulesets and CODEOWNERS** need the repository on GitHub and the
  tech lead's account name. Neither exists yet.
- **The audit log is a local file until the evidence is posted.** It is not
  tamper-proof: an allowed program can edit it. It records the lead's own
  tool calls without a task id, so the evidence comment leaves them out.
  The local log holds the first 300 characters of each shell command.
- **The maintainer plugins run unpinned code.** The Svelte MCP server
  starts with `npx -y @sveltejs/mcp` and Astral's language server with
  `uvx ty@latest`, so each session runs the newest release. The Svelte
  plugin also ships an agent, `svelte-file-editor`, that accepts edits
  without the kit's task paths. The tech lead accepted both risks on
  2026-11-20 ("Install the plugins as-is").
- **Agent transcripts are not part of the trace.** They stay in Claude
  Code's local files.

## Review history

| Reviewed at | Decision | Notes |
|---|---|---|
| 2026-11-15T11:16:22Z | Drafted | Initial version, written by Claude for the tech lead. |
| 2026-11-16T07:30:27Z | Approved | The tech lead replied "approve all" in the lead session. |
| 2026-11-16T11:26:43Z | Amended | Added D12, the audit trail and the evidence comment, at the tech lead's request ("yes add all three before the next tasks start"). |
| 2026-11-16T12:32:27Z | Amended | The lead session now changes kit files without a prompt, and each change is logged. The tech lead asked for this ("dont want you asking me for approvals for small changes as its slow"). Subagents are still refused. |
| 2026-11-16T12:32:27Z | Amended | The lead session now merges a task pull request when `sdlc merge-check` passes, and plans and kit fixes inside decided scope. The tech lead asked for this ("can you change the rule of dont wait for my approval on everything"). Scope, product rules, decision records, risk acceptance, relaxed rules and deploys stay with the tech lead. |
| 2026-11-20T23:02:34Z | Amended | Added D13: maintainers' plugins for Svelte and Python tooling, this project's skills for its own rules. The tech lead asked for this ("we sould use the ones the is published by the maintainers", then "yes go ahead") and chose "Install the plugins as-is" over pinning. |
| 2026-11-21T20:51:24Z | Amendment proposed | D4 gains two scopes, D11 says when evaluations run, D14 says which gates run where and reuses a pass on the same tree. The tech lead asked for this ("we cant run extensive test each time... if its just docs that are updated that doesnt need all the test") and chose "Yes, all of it". It takes effect when the tech lead merges the pull request. |
