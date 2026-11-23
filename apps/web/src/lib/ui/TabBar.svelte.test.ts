import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TabBar from './TabBar.svelte';

/** Renders the bar at an address and returns its tabs, found by role in the named bar. */
async function renderTabs(pathname: string): Promise<Element[]> {
	const screen = await render(TabBar, { pathname });
	return screen.getByRole('navigation', { name: 'Views' }).getByRole('link').elements();
}

for (const [pathname, current] of [
	['/', ['Packs']],
	['/packs', ['Packs']],
	['/match', ['Match']],
	['/games', ['Games']],
	['/games/', ['Games']],
	['/games/transfer-trail', ['Games']],
	['/gamesx', []],
	['/cards', ['Cards']],
	['/guide/', ['Guide']],
	['/no-such-page', []]
] as const) {
	test(`at ${pathname} the current tab is ${current.join('') || 'none'}`, async () => {
		const tabs = await renderTabs(pathname);

		const marked = tabs.filter((tab) => tab.getAttribute('aria-current') === 'page');

		expect(marked.map((tab) => tab.textContent)).toEqual(current);
	});
}

test('each of the five tabs links to its own view', async () => {
	const tabs = await renderTabs('/');

	expect(tabs.map((tab) => [tab.textContent, tab.getAttribute('href')])).toEqual([
		['Packs', '/packs'],
		['Match', '/match'],
		['Games', '/games'],
		['Cards', '/cards'],
		['Guide', '/guide']
	]);
});
