---
id: T-0033
title: Make the type generator's file guard work on any checkout path
component: schema
kind: fix
agent: web-implementer
paths:
  - packages/schema/src/generate-types.ts
  - packages/schema/src/generate-types.test.ts
  - packages/schema/src/node.d.ts
  - packages/schema/package.json
  - packages/schema/tsconfig.json
  - pnpm-lock.yaml
dependencies:
  - '@types/node'
max_changed_lines: 120
status: done
---

## Goal

`pnpm run generate` and the freshness test work when the repository is
checked out in a folder with a space, an accent or a bracket in its path.
Today the guard refuses the reference between the two schema files there.

## Context

- Review of T-0031: reviewer F1, F2 and F3, security-reviewer F1 and F2.
- `packages/schema/src/generate-types.ts`: the guard compares a plain
  folder path with the percent-encoded address the reference parser passes.
- The tech lead agreed to `@types/node` as a dev dependency on 2026-11-18.
  It replaces the hand-written `src/node.d.ts`.
- `pnpm-workspace.yaml`: `minimumReleaseAge` is seven days. Pick the newest
  `@types/node` for the Node major in `.node-version` that is old enough.
- Aim for about 60 changed lines, lockfile included. The limit is 120.

## Acceptance criteria

- The guard decodes the address the way the parser's own file resolver
  does before it compares, and still accepts only a `.schema.json` file in
  the schema's own folder.
- Generation succeeds for a schema folder whose path has a space and an
  accented letter, with a sibling reference in it.
- A `.schema.json` file outside the schema folder is refused.
- A symbolic link named `*.schema.json` that points outside the folder is
  refused.
- `@types/node` is a dev dependency of `packages/schema`, `src/node.d.ts`
  is deleted, and `tsc` still passes.
- The generated files are unchanged, byte for byte.
- `make check COMPONENT=schema` passes.

## Edge cases

- An address with `%2e%2e/` or `..%2F` in it. Decoding must not turn a
  refused path into an accepted one.
- A file name with a percent sign in it.
- Adding `@types/node` changes what `tsc` accepts elsewhere in the package.
  If a file outside this brief's paths then fails, stop and tell the lead.

## Tests

- `packages/schema/src/generate-types.test.ts`: a row for a folder with a
  space and an accent, a row for a `.schema.json` file outside the folder,
  a row for the symbolic link, and a row for each encoded `..` form.
- Each new refusal row asserts that the file's content is not in the
  result.

## Out of scope

- Windows paths.
- Any schema file, and the design lint.
