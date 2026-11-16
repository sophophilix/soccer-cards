# Configuration reference

Read this when you create or change tool configuration. Each block says how
far it has been verified. The scaffold task proves the rest and updates this
file through the tech lead.

## pnpm-workspace.yaml

Keys and meanings are from the pnpm supply chain page, read 2026-11-15.

```yaml
packages:
  - apps/*
  - packages/*

# Wait a week before installing a new version (minutes).
minimumReleaseAge: 10080

# Fail the install when a dependency has a build script that isn't allowed.
strictDepBuilds: true

# Block transitive dependencies that come from git or a tarball URL.
blockExoticSubdeps: true

# Fail the install when a package's trust level drops.
trustPolicy: no-downgrade

# allowBuilds lists the few packages that may run build scripts.
# Its value format is on https://pnpm.io/settings. Read it before adding one.
```

Dependabot waits 14 days before proposing an update, the same as the team's
other repositories. The two delays together keep a compromised release out.

## TypeScript compiler options

Option names are long-standing TypeScript options. Set them in a shared
`tsconfig.base.json` that each package extends. The app also extends the
config SvelteKit generates (`$app/tsconfig` in SvelteKit 3).

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

TypeScript 6 no longer includes every `@types` package by default, according
to secondary sources. List the ones a package needs under `types`.

## Vitest Browser Mode

From the Vitest Browser Mode guide (version 5.1.0), read 2026-11-15. Add the
SvelteKit Vite plugin to `plugins`.

```ts
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	test: {
		browser: {
			provider: playwright(),
			enabled: true,
			instances: [{ browser: 'chromium' }]
		}
	}
});
```

`packages/game` runs in Node, with no browser block.

## Not yet verified

The scaffold task must prove these on the day and record the result:

- the ESLint flat config that combines typescript-eslint's type-checked
  presets with `eslint-plugin-svelte` under SvelteKit 3
- `svelte-check` against TypeScript 6
- the Knip configuration for a pnpm workspace with a SvelteKit app
- the OSV-Scanner command for `pnpm-lock.yaml`, including that it reads both
  documents of the lockfile
- exact versions of every tool, read from the registry
