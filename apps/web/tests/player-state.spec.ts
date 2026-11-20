import { expect, test } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY, createPlayerStore } from '../src/lib/state/player-store.ts';

// No view uses the store yet, so its saved text goes into the page from here. A test of the
// store running inside the page belongs to the first screen that uses it (review F3).
test('a save sets no cookie, and the saved text survives a reload', async ({ page, context }) => {
	let saved = '';
	const store = createPlayerStore(() => ({
		getItem: () => (saved === '' ? null : saved),
		setItem: (_key, text) => (saved = text)
	}));
	store.load();
	store.save({ ...createPlayerState(), coins: 12 });
	await page.goto('/');
	await page.evaluate(
		([key, text]) => {
			localStorage.setItem(key, text);
		},
		[STATE_KEY, saved] as const
	);

	await page.reload();

	expect(await page.evaluate((key) => localStorage.getItem(key), STATE_KEY)).toBe(saved);
	expect(await context.cookies()).toEqual([]);
});
