/** @type {import('prettier').Config} */
export default {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	plugins: ['prettier-plugin-svelte'],
	overrides: [
		{ files: ['*.md', '*.yaml', '*.yml'], options: { useTabs: false } },
		{ files: '*.svelte', options: { parser: 'svelte' } }
	]
};
