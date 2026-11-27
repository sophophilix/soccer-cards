# ADR 0012: Local verification and the machine budget

> Status: Approved
> Created: 2026-11-27T21:48:16Z
> Last reviewed: 2026-11-27T21:48:16Z
> Next review: after the first ten tasks delivered under it

## Review guide

Decision requested: run heavy gates within one budget per machine, own every process a gate starts, and leave the three-browser end-to-end suite to CI.

The tech lead approved this on 2026-11-23 ("approve, do phase 1 first then the test tasks"). The evidence is in `docs/reviews/local-machine-crashes-20261123T195453Z.md`.

## Context

WindowServer stopped itself three times between 2026-11-21 and 2026-11-23, because parallel agent runs used all the Mac's memory. One web gate used 7.5 GB and 63 processes. Up to six ran at once: one per actor per task, across three tasks. Nothing limited them across worktrees or projects. A killed gate left its children running. Nothing removed worktrees.

Published guidance puts fast, reliable tests before a change lands and slower, broader tests later in the pipeline. Playwright starts one worker per CPU core by default, and each worker starts its own browser.

## Decisions

### D1. Local end-to-end runs use one browser and two workers. CI runs all three browsers.

Off CI, `make check` and `make e2e` pass `--project=phone-chromium --workers=2` to Playwright. `E2E_ALL=1` runs every browser locally.

In the affected scope, `make check COMPONENT=web` runs only the specs the change targets. When the targeting says "all", it skips the end-to-end tests and prints that CI runs them. The CI web job is then the only end-to-end evidence, and the lead merges only after it passes.

This amends ADR 0001 D8 and ADR 0004 D4. The web gate still includes end-to-end tests. Locally it includes the targeted ones only.

### D2. One budget per machine

`bin/sdlc capacity` reads physical memory and sets two numbers:

| Memory      | Profile | Agents at once | Heavy-gate slots |
| ----------- | ------- | -------------- | ---------------- |
| under 12 GB | small   | 1              | 1                |
| 12 to 16 GB | small   | 2              | 1                |
| 17 to 32 GB | medium  | 3              | 1                |
| over 32 GB  | large   | 4              | 2                |

`SDLC_MAX_AGENTS` and `SDLC_HEAVY_SLOTS` override them. The lead uses `agents` as its parallel ceiling, counting reviewers. It replaces "Three at a time".

The web, game, schema and data gates are heavy. Each takes a slot before it runs. A slot is an `flock` on a file in `~/.local/state/sdlc/`, outside any repository, so every worktree and every project that uses this kit shares it. The kernel frees the lock when its holder dies. A gate waits up to 1,500 s for a slot, then reports `unavailable`. CI skips the slot, because a runner holds one job.

### D3. One pass, saved once and reused

Implementers commit, then run `bin/sdlc verify` once. They no longer run `make check` as well. `verify` saves a pass for a clean tree. After it takes a slot, it checks again for a saved pass. So the finish hook, the lead and the reviewer reuse the implementer's pass instead of rerunning the gate.

A fuller "one verdict per commit", where every later actor reads the commit's saved result and its CI checks, is phase 2 of the architecture review. It needs its own decision.

### D4. The kit owns the processes and worktrees it starts

- Every gate runs in its own process group. The kit stops the whole group on a timeout, on `SIGTERM`, `SIGHUP` or `SIGINT`, and after a normal exit.
- Gate output goes to temporary files, not pipes. A leftover child can't hold the gate open.
- The kit records each running group in `~/.local/state/sdlc/groups/`. `bin/sdlc reap` stops a recorded group whose owner is gone, and any orphaned group whose every process runs from under `.claude/worktrees/`. A `SessionStart` hook runs it.
- The lead removes a task's worktree after its pull request merges.

## Consequences

- No combination of agents and worktrees can start more heavy gates than the machine has slots.
- A 16 GB laptop runs two agents and one heavy gate. An 8 GB laptop runs one of each.
- Parallel tasks queue at the gate. Building and reviewing still run in parallel.
- A WebKit-only or desktop-only end-to-end failure shows up in CI, not locally.
- A session killed with `SIGKILL` can't stop its own group. The next session's `reap` does.
- Another project shares the budget only if it uses this kit's `bin/sdlc`.

## Review history

| Reviewed at          | Decision | Notes                                                                                                                                                                                                                                                                                         |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-27T21:48:16Z | Approved | Phase 1 of `docs/reviews/local-machine-crashes-20261123T195453Z.md`. Tech lead: "approve, do phase 1 first then the test tasks". Measured after the change: two web gates started together queue for one slot, run 197 tests each in one browser in about 78 s, and add about 2.9 GB at peak. |
