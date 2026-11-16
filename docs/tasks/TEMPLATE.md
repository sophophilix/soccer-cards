---
id: T-0000
title: One line, in the imperative
component: web
kind: feature
agent: web-implementer
paths:
  - apps/web/src/lib/example/**
dependencies: []
max_changed_lines: 400
status: ready
---

<!--
Copy this file to docs/tasks/T-NNNN-short-slug.md. `bin/sdlc task-check` validates it.

component: web | game | schema | data | infra | ci | docs | sdlc
kind:      feature | fix | refactor | chore | docs
agent:     web-implementer | data-implementer | infra-implementer | refactorer
paths:     globs the agent may change. Nothing else can be written.
dependencies: every new package this task may add, by name.
max_changed_lines: 400 or fewer. Split the task if it needs more.
A refactor may set `tests_may_change: true` only to move or rename test files.
-->

## Goal

What changes for the player or the next developer, and why now.

## Context

The decision records, files and prototype behaviour the agent must read first.

## Acceptance criteria

- A result someone can check, one per line.

## Edge cases

- Inputs and states the change must handle, one per line.

## Tests

- The tests that prove each criterion, and where they live.

## Out of scope

- What this task must not touch, even if it looks related.
