/** @type {import('prettier').Config} */
export default {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	overrides: [{ files: ['*.md', '*.yaml', '*.yml'], options: { useTabs: false } }]
};
