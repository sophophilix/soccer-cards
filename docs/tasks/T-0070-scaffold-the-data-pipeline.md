---
id: T-0070
title: Scaffold the data pipeline as a uv project with its gate
component: data
kind: feature
agent: data-implementer
paths:
  - data/pipeline/**
  - .gitignore
dependencies:
  - pytest
  - pytest-cov
  - ruff
  - mypy
  - bandit
max_changed_lines: 250
status: ready
---

## Goal

`data/pipeline/` exists as a Python project that the next tasks fill in,
and `make check COMPONENT=data` passes on it.

## Context

- ADR 0006 D5, ADR 0001 D1. The `python-standards`, `python-style-guide`,
  `python-testing` and `game-data-api` skills.
- `make check COMPONENT=data` runs, in `data/pipeline/`: `uv sync --frozen`,
  `ruff check`, `ruff format --check`, `mypy` (strict) on `src` and `tests`,
  `bandit -c pyproject.toml -r src`, and `pytest`.
- Use the newest releases of the listed packages that are at least two weeks
  old, pinned through `uv.lock`, which only `uv` writes.

## Acceptance criteria

- `data/pipeline/pyproject.toml` declares the package `soccer_cards_data`
  under `src/`, Python 3.13 or newer, and the listed tools as development
  dependencies only. It has no runtime dependency yet.
- ruff, mypy (strict), bandit and pytest (with coverage, failing under 90%)
  are configured in `pyproject.toml`.
- A console entry point `scdata` prints the package version with
  `--version` and exits 0, and prints usage and exits 2 for no command.
- `uv.lock` is committed. `.gitignore` excludes `.venv/`, caches and the
  pipeline's future fetch cache folder `data/pipeline/.cache/`.
- `make check COMPONENT=data` passes.

## Edge cases

- An unknown command prints usage to standard error and exits 2.

## Tests

- `data/pipeline/tests/test_cli.py`: `--version`, no command, unknown
  command.

## Out of scope

- Any fetch, rating or output (T-0071, T-0072), and CI (T-0073).
