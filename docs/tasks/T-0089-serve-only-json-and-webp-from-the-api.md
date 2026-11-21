---
id: T-0089
title: Serve only folders, JSON and WebP from the API folder
component: web
kind: fix
agent: web-implementer
paths:
  - apps/web/vite.config.ts
  - apps/web/node-builtins.d.ts
  - apps/web/src/lib/data/api-files.ts
  - apps/web/src/lib/data/api-files.test.ts
dependencies: []
max_changed_lines: 160
status: ready
---

## Goal

The build copies only folders, `.json` and `.webp` files from
`data/api/v1/`, never follows a link, and warns about anything it skips
(T-0085 security review F1 and F2). Split from T-0085, which keeps only the
copy-after-hash order.

## Context

- T-0085's `vite.config.ts` copy step, `writeScriptHashesToHeaders`, the
  `cloudflare-infra` skill "Response headers", ADR 0002 D5.

## Acceptance criteria

- The copy walks the folder with `lstat`. It copies folders, `.json` and
  `.webp` files only, and skips hidden entries, symlinks (to files or
  folders), the folder itself if it is a link, and every other file type,
  each with a build warning naming the path.
- A missing folder copies nothing; any other error stops the build.
- `api-files.ts` holds the rule; its test covers each served and skipped
  kind.
- `make check COMPONENT=web` passes.

## Edge cases

- `players.json.html`, a hidden folder, and a link to a folder.

## Tests

- `api-files.test.ts` as above.

## Out of scope

- The copy order (T-0085).
