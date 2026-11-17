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

/**
 * Reports a relative import that resolves outside `packages/game`. The built-in
 * `no-restricted-imports` can't tell, because it doesn't know how deep the file is.
 * @type {import('eslint').Rule.RuleModule}
 */
const noImportOutsidePackage = {
	meta: {
		type: 'problem',
		schema: [],
		messages: { outside: "'{{source}}' leaves packages/game." }
	},
	create(context) {
		// `node` is an import or a re-export. A re-export with no `from` has no source.
		const check = (node) => {
			const source = node.source?.type === 'Literal' ? node.source.value : undefined;
			if (typeof source !== 'string' || !source.startsWith('.')) return;
			const target = path.resolve(path.dirname(context.filename), source);
			if (path.relative(GAME_ROOT, target).startsWith('..')) {
				context.report({ node, messageId: 'outside', data: { source } });
			}
		};
		return {
			ImportDeclaration: check,
			ExportNamedDeclaration: check,
			ExportAllDeclaration: check,
			ImportExpression: check
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
					paths: [
						...builtinModules,
						{
							name: 'fast-check',
							importNames: ['configureGlobal'],
							message: 'Only src/testing/property-seed.ts sets the shared seed.'
						}
					],
					patterns: ['node:*', 'svelte', 'svelte/*', '@sveltejs/*', '@soccer-cards/web']
				}
			],
			// fast-check replaces its whole configuration on each call, so a second
			// call would drop the shared seed for that file with no failure.
			'no-restricted-syntax': [
				'error',
				{
					selector: "CallExpression[callee.property.name='configureGlobal']",
					message: 'Only src/testing/property-seed.ts sets the shared seed.'
				}
			],
			'no-restricted-properties': [
				'error',
				{ object: 'Math', property: 'random', message: 'Use the injected generator.' }
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
