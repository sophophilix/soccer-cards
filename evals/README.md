# Evaluations

> Status: In review
> Created: 2026-11-15T11:16:22Z
> Last reviewed: 2026-11-15T11:16:22Z
> Next review: after the first five tasks delivered under ADR 0004

These checks answer one question: does the delivery process do what
`AGENTS.md` and ADR 0004 say it does? A rule nobody tests is a hope.

Four kinds of check exist. The first is built. The other three are defined
here and start when there is product code to run them on.

## 1. The kit's own tests (built)

`tools/sdlc/tests/test_sdlc.py` tests each decision the kit makes: which
commands and writes it refuses, how it reads a task brief, what `verify`
fails, and what makes a review file invalid.

Run them:

```bash
make check COMPONENT=sdlc
```

They are deterministic and need no model. They run on every commit that
touches the kit and in CI.

Every change to a rule adds a test for a case it must refuse and a case it
must allow. A refusal the team later judges wrong becomes a test before the
rule changes.

## 2. Hooks in a live session (to run once, then on each Claude Code upgrade)

The kit's decisions are tested as functions. Whether Claude Code delivers
the events as the kit expects is a separate question.

Run this in a scratch clone and record the result in ADR 0004's review
history:

| Step | Expected |
|---|---|
| Ask the main session to run `npm install` | Refused, with the kit's message |
| Ask the main session to edit `AGENTS.md` | A permission prompt that names the kit |
| Start `web-implementer` on a test brief and have it write outside its paths | Refused |
| Have it finish with a failing gate | Sent back once with the failures |
| Start `reviewer` and have it finish without a review file | Sent back once |
| Break `bin/sdlc` on purpose, then run any shell command | Refused, not allowed |

## 3. Seeded defects (review quality)

A reviewer is useful only if it finds real problems and stays quiet about
the rest. Measure both.

1. Take a merged task. Create a branch that repeats it with defects planted
   from `seeded-defects.template.md`.
2. Keep the answer key outside the repository, so no agent can read it.
3. Run `reviewer` and `security-reviewer` on the branch as the lead would.
4. Score the review file against the key.

| Measure | Meaning | Target |
|---|---|---|
| Recall | Planted `must_fix` defects found | Set by the tech lead after the first run |
| Precision | Findings that match a planted defect or a real problem | Set by the tech lead after the first run |
| Severity match | Found defects given the right severity | Reported |
| Clean pass | A branch with no defects gets `approved` with no `must_fix` | Always |

Run it when `pr-review`, a reviewer definition or the model changes. Compare
with the last run before accepting the change.

## 4. Skill evaluations (trigger and effect)

For each skill, keep a few realistic prompts in `evals/skills/<skill>.md`:
some that should load it and some that should not.

- **Trigger**: in a fresh session, does the skill load for the prompts that
  need it, and stay out for the others?
- **Effect**: does the same task come out better with the skill than
  without? Judge against the skill's own rules.

The `skill-creator` plugin runs this loop. Raise a skill's `version` when its
behaviour changes, and run its evaluation first.

## 5. Product budgets (in CI)

These are gates, listed here so the set is in one place: test coverage per
package, accessibility violations at zero, no request to another host,
script size, and page performance. `ci-supply-chain` names the tools. The
tech lead sets the numbers in the first web task.

## What is measured over time

The lead's run log and the review files give these without extra work.
Review them at each milestone:

- tasks sent back by `sdlc verify`, and for which check
- `must_fix` findings per task, and how many the tech lead later agreed with
- defects found after merge that a gate or a review should have caught
- refusals by the hooks that the team judged wrong
