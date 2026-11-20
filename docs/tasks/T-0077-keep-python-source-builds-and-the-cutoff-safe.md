---
id: T-0077
title: Check the source-build list before install, and keep the cutoff moving
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/pyproject.toml
  - data/pipeline/uv.lock
  - data/pipeline/tools/check_no_build.py
  - data/pipeline/tests/test_project.py
  - data/pipeline/tests/test_check_no_build.py
  - .github/CODEOWNERS
max_changed_lines: 200
dependencies: []
status: ready
---

## Goal

A Dependabot update that brings in a package without a wheel fails before
anything is installed, and Dependabot can still propose updates while new
releases wait two weeks (T-0074 reviews: security F1, reviewer F1, F3).

## Context

- `data/pipeline/pyproject.toml`: `exclude-newer` is a fixed date, and
  `no-build-package` lists every locked package. Its test runs only after
  `uv sync`.
- `.github/dependabot.yml`: the uv entry has a 14-day cooldown.
- Read uv's documentation for `exclude-newer` (whether it takes a relative
  duration) and for `no-build` before choosing.

## Acceptance criteria

- `tools/check_no_build.py`, run with the standard library only, reads
  `uv.lock` and `pyproject.toml` and exits non-zero naming any locked or
  build-system package missing from `no-build-package`. It needs no
  installed packages, so the gate can run it before `uv sync`.
- The cutoff no longer blocks Dependabot: either `exclude-newer` becomes a
  relative two-week window if uv supports it, or it is removed and the
  report explains how the 14-day cooldown and the lock review keep the
  two-week rule. Say which, with the documentation you relied on.
- `.github/CODEOWNERS` owns `data/pipeline/pyproject.toml` and
  `data/pipeline/uv.lock`.
- `make check COMPONENT=data` passes. The lead adds the check to the
  `Makefile` before `uv sync`.

## Edge cases

- A lock with an editable project entry doesn't count it as a missing
  package.

## Tests

- `tests/test_check_no_build.py`: complete list passes; a missing locked
  package and a missing build-system package each fail with its name.

## Out of scope

- The Makefile (the lead changes it), scans and Dependabot.
