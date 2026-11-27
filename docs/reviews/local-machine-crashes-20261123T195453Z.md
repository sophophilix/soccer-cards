# Delivery kit architecture review: crashes, cost per task and autonomy

> Status: Approved
> Created: 2026-11-23T19:54:53Z
> Last reviewed: 2026-11-27T21:48:16Z
> Next review: Not scheduled

## Review guide

Decision requested: approve the target design and the three decisions in "Decisions for the tech lead". Each needs a new decision record, because it changes ADR 0004 or rule 1.

Check these points:

- [ ] The end-to-end tests run in CI, not on the laptop. Local runs are opt-in.
- [ ] One verdict per commit. Reviewers, the lead and merge-check read it and don't rerun it.
- [ ] Production deploys run without a per-deploy approval, behind an automatic smoke test and rollback.

Respond with one of:

- `approve`
- `approve with follow-up: <action>`
- `request changes: <specific issue>`

## Summary

48 GB is enough. The kit spends it badly.

A task needs about 4 GB of tooling for a few seconds to check everything except the end-to-end tests. The kit runs a 7.5 GB, three-browser end-to-end suite instead. It runs it about 11 times per task, from four different actors, with no limit across worktrees, and no knowledge of other projects running agents on the same Mac. On 23 November another project's fleet ran pytest and semgrep during the same minutes. Memory ran out, the kernel could not serve WindowServer (the macOS display process), and the login session restarted.

The crash is one symptom of eight design faults. Fixing them makes the kit run on a 16 GB laptop with two agents, and on an 8 GB laptop with one. It also takes the tech lead out of the routine path.

## What crashed

The Mac never rebooted. WindowServer stopped itself three times. The crash reports are in `/Library/Logs/DiagnosticReports/`.

| Crash report (local, +11:00)         | UTC               | Kernel note                           |
| ------------------------------------ | ----------------- | ------------------------------------- |
| `WindowServer-2026-11-22-022341.ips` | 2026-11-21T15:23Z | `SIGABRT`                             |
| `WindowServer-2026-11-23-055040.ips` | 2026-11-22T18:50Z | `vm_map_copyout_kernel_buffer failed` |
| `WindowServer-2026-11-24-004645.ips` | 2026-11-23T13:46Z | `vm_map_copyout_kernel_buffer failed` |

The kernel note means no memory was left to pass a message to WindowServer. `JetsamEvent-2026-11-23-045316.ips` (macOS's out-of-memory report) shows 44 GB of process memory squeezed into a 3.9 GB compressor, after 157 million compressions. That compression work is the heat and the fan noise.

Each crash follows overlapping web gates in `.sdlc/run-log.md`. The last one came 9 minutes after T-0177, T-0180 and T-0183 started in parallel.

## Measurements

Each layer of the web gate was run alone on `main` on 2026-11-23, with a sampler every 0.5 s. The memory figures are the peak above a 1.8 GB idle baseline.

| Layer                                     | Time | Peak memory | Processes |
| ----------------------------------------- | ---- | ----------- | --------- |
| Format, lint and type check               | 4 s  | 1.3 GB      | 4         |
| Unit tests (Vitest in a real Chromium)    | 4 s  | 2.9 GB      | 17        |
| ESLint on one file (the post-write hook)  | 1 s  | 0.3 GB      | 1         |
| Build                                     | 2 s  | 0.6 GB      | 2         |
| End-to-end, 1 browser, 2 workers          | 67 s | 2.8 GB      | 24        |
| End-to-end, 3 browsers, default 7 workers | 69 s | 7.5 GB      | 63        |

The audit log `.sdlc/audit.jsonl` covers 170 tasks:

| Event                                      | Count |
| ------------------------------------------ | ----- |
| `make check` typed by an agent             | 1,000 |
| `bin/sdlc verify` typed by an agent        | 910   |
| Playwright run directly                    | 309   |
| Finish-hook verifications (`SubagentStop`) | 607   |
| Gate passes saved for reuse                | 82    |

## Design faults

### F1. The laptop is used as the CI server

The end-to-end suite is the only heavy layer. Every local gate runs it in three browsers. CI's `checks.yml` runs the same `make check COMPONENT=web` on every pull request anyway. The repository is public, so CI minutes on GitHub's standard runners cost nothing. Local end-to-end runs add load and no new information.

### F2. No single verdict per commit

A task's gate runs when the implementer types it, in the finish hook, when the lead runs `verify` and when the reviewer runs `verify`. About 11 runs per task in total.

The kit saves a pass only when the working tree is clean. Implementers run `verify` before they commit, and `make check` bypasses the store completely. So 82 passes were saved against about 2,800 gate runs. Runs that start in the same minute can't reuse each other. The run log records these collisions as port clashes six times on 2026-11-23.

### F3. End-to-end selection falls back to "all"

`e2e_specs` in `tools/sdlc/sdlc.py` returns "all" for any change outside one route folder. Shared code in `src/lib`, `packages/game` and `packages/schema` all count. Almost every task touches one of them, so the affected scope almost always runs about 590 tests.

### F4. Test layers are inverted

All 34 unit test files run in a real Chromium through Vitest browser mode. Only 12 of them render a component. Pure logic pays 2.9 GB for a browser it doesn't use. Playwright then runs every spec in three browsers with `fullyParallel` and no worker limit.

### F5. No resource model

The parallel limit is a sentence in the delivery-lead skill: "Three at a time is the ceiling." It doesn't know the machine's memory. It doesn't know that each agent's gate runs more gates. It doesn't know about other projects. During the last crash a second orchestrator, in the `cerno` project, ran 4 subagents with 30 pytest runs and semgrep.

The `wt` shell function in `~/.zshrc` adds load the kit can't see. Each call starts a full Claude lead session in a kitty tab and a new Zed window with its own language servers. The kitty settings themselves are not a cause: 50,000 lines of scrollback per window is small.

### F6. No process ownership

`verify` starts gates with `subprocess.run(..., timeout=1500)`. On a timeout Python kills only `make`. When Claude Code kills the finish hook after 1800 s, or the tech lead stops an agent, the gate's children keep running. A `wrangler dev` server and two `workerd` processes from T-0121 have run for 2 days 9 hours. They survived all three crashes.

### F7. No worktree lifecycle

Agents with `isolation: worktree` create a worktree each. Nothing removes them. `.claude/worktrees/` holds 103 worktrees: 20 GB and 660,087 files. Spotlight, `fseventsd` and Zed watch all of them. The kernel's file table (`kern.num_vnodes`) is at its limit of 263,168 with the Mac idle.

### F8. The tech lead sits in the routine path

The run log shows work that waits for one person:

- Each production deploy needs approval. A merge to `main` voids a pending approval, so merges freeze while a deploy waits (2026-11-23 12:22 to 13:16 UTC).
- Cancelling stale CI runs needed the tech lead twice.
- Every kit fix, including the fixes in this review, needs the tech lead in the main session.

The rules protect the right things. But they gate each action, where they could gate a policy. A contributor without this harness has no path at all.

## Target design

### Three verification tiers

| Tier | When                  | Where                      | What runs                                                                                                                                                                    | Budget           |
| ---- | --------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0    | each file write       | agent's worktree           | Prettier on that file                                                                                                                                                        | 1 s, 0.3 GB      |
| 1    | `verify`, before push | agent's worktree, one slot | task rules, format, lint, type check, affected unit tests in Node, component tests in a browser, Knip, the end-to-end specs the change targets in one browser with 2 workers | about 90 s, 3 GB |
| 2    | each pushed commit    | CI                         | full gates, end-to-end tests in three browsers, data, infra, scanners                                                                                                        | the authority    |

Tier 1 is the definition of done on a laptop. It fits an 8 GB machine.

An agent pushes its branch and waits for tier 2 with `gh run watch`. Waiting uses no local memory. CI failure output goes back to the same agent.

Tier 1 runs only the end-to-end specs a change targets, in one browser with two workers. When the targeting can't decide (F3), tier 1 skips the end-to-end tests and CI runs them. The full suite in three browsers runs only in CI. `make e2e` stays available to run any spec locally, through a resource slot.

This follows the sources below. Fast, reliable tests run before a change lands. Slower, broader tests run later in the pipeline. End-to-end tests stay few. Developers still run the end-to-end test for the feature they are working on.

### Sources

Accessed 2026-11-23.

- Google, [Software Engineering at Google, chapter 23: Continuous Integration](https://abseil.io/resources/swe-book/html/ch23.html). On presubmit tests: "Our general rule of thumb is: only fast, reliable ones." Larger tests run after submit.
- Google, [Software Engineering at Google, chapter 14: Larger Testing](https://abseil.io/resources/swe-book/html/ch14.html). Larger tests "may be slow" and "may be nondeterministic".
- Google Testing Blog, [Just Say No to More End-to-End Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html) (2015). Keep end-to-end tests few. Catch integration bugs with smaller tests.
- Martin Fowler and Ham Vocke, [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html). "The more high-level you get the fewer tests you should have."
- Playwright, [Best practices](https://playwright.dev/docs/best-practices). "Ideally you should run your tests on each commit and pull request."
- Playwright, [Continuous integration](https://playwright.dev/docs/ci). Playwright defaults to one worker per detected core, and recommends 1 worker in CI "to prioritize stability and reproducibility".
- Playwright, [Parallelism](https://playwright.dev/docs/test-parallel). "Each starts its own browser."
- Vitest, [Browser mode](https://vitest.dev/guide/browser/). Node-based tests go in a separate `projects` entry.

### One verdict per commit

The verdict belongs to a commit, not to a run. The finish hook requires a commit and a clean tree, so every tier 1 result can be saved. The reviewer, the lead and `merge-check` read the saved tier 1 result and the CI checks for that commit. They never rerun them. Expected effect: from about 11 gate runs per task to 1 local and 1 in CI.

### A machine-wide resource budget

`bin/sdlc` gets a scheduler that every project on the machine shares. Its state lives outside any repository, for example under `~/.local/state/sdlc/`.

- `bin/sdlc capacity` reads total memory and reports a profile.
- The lead asks for capacity before it starts an agent. The fixed "three at a time" goes.
- A heavy job (tier 1 browser tests, local end-to-end) takes a slot or waits.

| Profile | Memory          | Agents at once | Heavy slots |
| ------- | --------------- | -------------- | ----------- |
| small   | 16 GB or less   | 1 (2 on 16 GB) | 1           |
| medium  | 17 to 32 GB     | 2 or 3         | 1           |
| large   | more than 32 GB | 4              | 2           |

These numbers are starting points. Tune them with the sampler used for this review. Because the state is shared, `cerno` and any other project that adopts the kit take slots from the same budget.

### Processes and worktrees owned by the kit

- Each gate runs in its own process group. The kit kills the whole group on timeout, on exit and on stop.
- `bin/sdlc reap` runs at session start. It stops processes whose worktree has no live agent.
- The kit removes a task's worktree when its pull request merges, and limits how many exist at once.
- `.claude/worktrees/` gets a `.metadata_never_index` marker so Spotlight skips it.

### Autonomy by policy

The tech lead approves policies, scope and decision records. Agents carry out actions inside them.

- **Deploy**: an agent deploys `main` when CI is green. A smoke test runs against production, and a failure rolls back to the previous Workers version automatically. The tech lead sees a report, not an approval request. This changes rule 1.
- **Kit changes**: an agent may open a kit pull request. A kit-reviewer agent and the kit's own tests check it. It merges on green unless it changes `AGENTS.md`, a decision record or a refusal rule. Those still go to the tech lead. This changes rule 2.
- **CI housekeeping**: cancelling superseded runs becomes a workflow `concurrency` setting, not a request.

### Contributors without the harness

A contributor on a small laptop runs `make check`, which is tier 1. They push and CI runs tier 2. Nothing in that path needs more than 2 GB or knows about agents. The kit and the human contributor use the same tiers.

## Decisions for the tech lead

1. **Local verification runs only the targeted end-to-end specs, in one browser. The full three-browser suite runs only in CI, and CI is the authority for it.** This changes ADR 0004 D4.
2. **One verdict per commit, read by every later actor.** This changes the reviewer's rule "run the gates yourself" in `.claude/agents/reviewer.md`.
3. **Deploys and kit changes run by policy, not per-action approval.** This changes rules 1 and 2.

## Delivery plan

Each phase leaves the kit working. The kit files change in the main session once you approve. Product files (`apps/web/vite.config.ts`, `apps/web/playwright.config.ts`) go through task briefs.

| Phase | Work                                                                                                                                                              | Result                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1     | Process groups and `reap`. Machine-wide slot. Tier 1 `verify` without end-to-end tests. Agents wait on CI. Remove merged worktrees.                               | No crash on any machine size. Fewer heavy runs.           |
| 2     | One verdict per commit. `capacity` profiles. Pure unit tests in Node. Local Playwright limited to 1 browser and 2 workers. `e2e_specs` maps shared code properly. | About 2 gate runs per task. Small-machine profile tested. |
| 3     | Decision record and workflows for policy deploys with smoke test and rollback. Kit-reviewer path. CI `concurrency` settings.                                      | The tech lead out of the routine path.                    |

## Risks and open items

- Waiting on CI adds about 7 minutes per task. Agents wait in parallel and use no local memory, so throughput should rise. Measure this in phase 1.
- Automatic production deploys need a reliable smoke test and a tested rollback before rule 1 changes. Phase 3 must prove both on a preview environment first.
- The small-profile numbers are estimates until someone measures them on a 16 GB machine.
- The 21 November crash has no out-of-memory report. Its cause is inferred from the other two.
- The `com.apple.Virtualization` process held 4 GB in the out-of-memory report. It is probably the Claude desktop app's virtual machine and is outside this repository.
- `cerno` gets the shared budget only if it adopts the same `bin/sdlc` scheduler.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                                                                                                                         |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-23T19:54:53Z | Drafted  | First version proposed local limits only.                                                                                                                                                                                     |
| 2026-11-23T19:54:53Z | Revised  | Tech lead asked for a root cause in the design, small-machine support and less human gating. Replaced with an architecture review. Added per-layer measurements, the audit counts, the `cerno` overlap and the `wt` function. |
| 2026-11-23T20:53:47Z | Revised  | Checked against published testing guidance. Corrected tier 1: it keeps the targeted end-to-end specs in one browser, and only the full suite moves to CI. Added sources.                                                      |
| 2026-11-27T21:48:16Z | Approved | Tech lead: "approve, do phase 1 first then the test tasks". Phase 1 recorded as ADR 0012. Phases 2 and 3 still need their own decisions.                                                                                      |
