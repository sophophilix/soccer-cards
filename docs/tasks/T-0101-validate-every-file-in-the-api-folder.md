---
id: T-0101
title: Refuse unknown or unreadable files in the API folder
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/validate.py
  - data/pipeline/tests/test_validate.py
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
  - .gitignore
dependencies:
  - referencing
max_changed_lines: 150
status: ready
---

## Goal

Nothing reaches the published API folder without being checked (T-0083
review findings), and a half-finished build folder is never committed
(T-0098).

## Acceptance criteria

- `validate` fails on any file it doesn't recognise as an API file: an
  extra root file, a non-JSON file in `players/` or `clubs/`, a folder in
  `photos/`. The error names the path.
- A file that isn't UTF-8 or isn't valid JSON raises `ValidationError`
  naming the file, not a decode error.
- `referencing`, imported directly, is declared in `pyproject.toml` with
  `uv add`.
- `.gitignore` ignores the build's temporary folders `data/api/.v1-*`.
- `make check COMPONENT=data` passes.

## Tests

- A stray root file, a stray file in `players/`, invalid JSON, non-UTF-8.

## Out of scope

- Cross-file checks (T-0103).
