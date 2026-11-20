import { builtinModules } from 'node:module';
import path from 'node:path';
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MAX_FILE_LINES = 400;
const MAX_COMPLEXITY = 15;
const GAME_ROOT = path.join(import.meta.dirname, 'packages/game');
const SEED_MESSAGE = 'Only src/testing/property-seed.ts sets the shared seed.';
// ADR 0001 D1 and D4: each name, and every path below it, is refused in packages/game.
const GAME_RESTRICTED_PACKAGES = ['svelte', '@sveltejs', '@soccer-cards/web'];
const STORAGE_NAMES = ['localStorage', 'sessionStorage', 'indexedDB'];
const STORAGE_MESSAGE = 'Only apps/web/src/lib/state reads or writes storage.';

/**
 * Reports a relative import that resolves outside `packages/game`. The built-in
 * `no-restricted-imports` can't tell, because it doesn't know how deep the file is.
 * It also reports a Node built-in or a restricted package in `import()` and in an
 * import type, which that rule doesn't visit.
 * @type {import('eslint').Rule.RuleModule}
 */
const noImportOutsidePackage = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			outside: "'{{source}}' leaves packages/game.",
			builtIn: "'{{source}}' is a Node built-in, and packages/game imports none.",
			restricted: "'{{source}}' is above packages/game, which imports nothing above it."
		}
	},
	create(context) {
		// `node` is an import or a re-export. A re-export with no `from` has no source.
		const sourceOf = ({ source }) => {
			if (source?.type === 'Literal') return source.value;
			const isPlainTemplate = source?.type === 'TemplateLiteral' && source.expressions.length === 0;
			return isPlainTemplate ? source.quasis[0].value.cooked : undefined;
		};
		const check = (node) => {
			const source = sourceOf(node);
			if (typeof source !== 'string' || !source.startsWith('.')) return;
			const target = path.resolve(path.dirname(context.filename), source);
			if (path.relative(GAME_ROOT, target).startsWith('..')) {
				context.report({ node, messageId: 'outside', data: { source } });
			}
		};
		const checkDynamic = (node) => {
			const source = sourceOf(node);
			if (typeof source !== 'string') return;
			if (source.startsWith('node:') || builtinModules.includes(source)) {
				context.report({ node, messageId: 'builtIn', data: { source } });
			}
			const isRestricted = GAME_RESTRICTED_PACKAGES.some(
				(name) => source === name || source.startsWith(`${name}/`)
			);
			if (isRestricted) context.report({ node, messageId: 'restricted', data: { source } });
			check(node);
		};
		return {
			ImportDeclaration: check,
			ExportNamedDeclaration: check,
			ExportAllDeclaration: check,
			ImportExpression: checkDynamic,
			TSImportType: checkDynamic
		};
	}
};

export default defineConfig(
	globalIgnores([
		'**/node_modules/',
		'**/coverage/',
		'**/dist/',
		'**/build/',
		'**/.svelte-kit/',
		'**/.wrangler/',
		'**/test-results/',
		'**/playwright-report/'
	]),
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	svelte.configs.recommended,
	svelte.configs.prettier,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte']
			}
		},
		linterOptions: { reportUnusedDisableDirectives: 'error' },
		rules: {
			complexity: ['error', MAX_COMPLEXITY],
			'max-lines': ['error', MAX_FILE_LINES],
			// The security floor: no code built from a string.
			'no-eval': 'error',
			'no-new-func': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error'
		}
	},
	{
		// ADR 0001 D1 and D4: the game rules are pure and import nothing above them.
		files: ['packages/game/**/*.{ts,js}'],
		plugins: { game: { rules: { 'no-import-outside-package': noImportOutsidePackage } } },
		rules: {
			'game/no-import-outside-package': 'error',
			'no-restricted-imports': [
				'error',
				{
					paths: builtinModules,
					patterns: ['node:*', ...GAME_RESTRICTED_PACKAGES.flatMap((name) => [name, `${name}/*`])]
				}
			],
			// fast-check replaces its whole configuration on each call, so a second
			// call would drop the shared seed for that file with no failure.
			'no-restricted-syntax': [
				'error',
				{
					selector: "CallExpression[callee.property.name='configureGlobal']",
					message: SEED_MESSAGE
				},
				{ selector: "ImportSpecifier[imported.name='configureGlobal']", message: SEED_MESSAGE }
			],
			'no-restricted-properties': [
				'error',
				{ object: 'Math', property: 'random', message: 'Use the injected generator.' }
			]
		}
	},
	{
		// ADR 0001 D6 and the security floor: only lib/state reads or writes the browser's storage.
		files: ['apps/web/src/**/*.{ts,js,svelte}'],
		ignores: ['apps/web/src/lib/state/**'],
		rules: {
			'no-restricted-globals': [
				'error',
				...STORAGE_NAMES.map((name) => ({ name, message: STORAGE_MESSAGE }))
			],
			// With no object named, the name is refused on any object, such as document.defaultView.
			'no-restricted-properties': [
				'error',
				...STORAGE_NAMES.map((property) => ({ property, message: STORAGE_MESSAGE }))
			]
		}
	},
	{
		// Svelte files are parsed by svelte-eslint-parser, and their scripts by typescript-eslint.
		files: ['apps/web/**/*.svelte', 'apps/web/**/*.svelte.ts'],
		languageOptions: { globals: globals.browser, parserOptions: { parser: tseslint.parser } }
	},
	{
		files: ['packages/game/src/testing/property-seed.ts'],
		rules: { 'no-restricted-syntax': 'off' }
	},
	// Named one by one, so the type-checked rules stay on for every other `.js` file.
	{
		files: ['eslint.config.js', 'prettier.config.js'],
		extends: [tseslint.configs.disableTypeChecked]
	}
);
