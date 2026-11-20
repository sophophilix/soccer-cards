import { expect, test } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY, createPlayerStore } from '../src/lib/state/player-store.ts';

// No view uses the store yet, so it runs here and its saved text goes through the page's storage.
test('progress saved by the store survives a reload, and no cookie is set', async ({
	page,
	context
}) => {
	const state = { ...createPlayerState(), coins: 12, wins: 3 };
	let saved = '';
	const writer = createPlayerStore(() => ({
		getItem: () => (saved === '' ? null : saved),
		setItem: (_key, text) => (saved = text)
	}));
	writer.load();
	writer.save(state);
	await page.goto('/');
	await page.evaluate(
		([key, text]) => {
			localStorage.setItem(key, text);
		},
		[STATE_KEY, saved] as const
	);

	await page.reload();
	const kept = await page.evaluate((key) => localStorage.getItem(key), STATE_KEY);

	const reader = createPlayerStore(() => ({ getItem: () => kept, setItem: () => undefined }));
	expect(reader.load()).toEqual({ state, outcome: 'loaded' });
	expect(await context.cookies()).toEqual([]);
});
