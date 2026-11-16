import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const MAX_FILE_LINES = 400;
const MAX_COMPLEXITY = 15;

export default defineConfig(
	globalIgnores(['**/node_modules/', '**/coverage/', '**/dist/', '**/build/', '**/.svelte-kit/']),
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
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
	{ files: ['*.config.js'], extends: [tseslint.configs.disableTypeChecked] }
);
