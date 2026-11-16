import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MAX_FILE_LINES = 400;
const MAX_COMPLEXITY = 15;

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
			'@typescript-eslint/switch-exhaustiveness-check': 'error'
		}
	},
	{
		// ADR 0001 D1 and D4: the game rules are pure and import nothing above them.
		files: ['packages/game/**/*.{ts,js}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{ patterns: ['node:*', 'svelte', 'svelte/*', '@sveltejs/*', '@soccer-cards/web'] }
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
	{ files: ['*.config.js'], extends: [tseslint.configs.disableTypeChecked] }
);
