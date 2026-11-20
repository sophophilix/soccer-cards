import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TabBar from './TabBar.svelte';

/** The name of each tab marked as the current page. */
function currentTabs(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[aria-current="page"]')].map((tab) => tab.textContent);
}

for (const [pathname, current] of [
	['/', ['Packs']],
	['/packs', ['Packs']],
	['/match', ['Match']],
	['/cards', ['Cards']],
	['/guide/', ['Guide']],
	['/no-such-page', []]
] as const) {
	test(`at ${pathname} the current tab is ${current.join('') || 'none'}`, async () => {
		const screen = await render(TabBar, { pathname });

		await expect.element(screen.getByRole('navigation', { name: 'Views' })).toBeVisible();
		expect(currentTabs(screen.container)).toEqual(current);
	});
}

test('each of the four tabs links to its own view', async () => {
	const screen = await render(TabBar, { pathname: '/' });

	const links = [...screen.container.querySelectorAll('a')].map((link) =>
		link.getAttribute('href')
	);

	expect(links).toEqual(['/packs', '/match', '/cards', '/guide']);
});
