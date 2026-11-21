import { expect, test, type Page } from '@playwright/test';
import { createPlayerState, type PlayerState } from '@soccer-cards/game';
import { readFile } from 'node:fs/promises';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

const example = async (name: string): Promise<Record<string, unknown>> =>
	JSON.parse(await readFile(`../../packages/schema/schemas/v1/examples/${name}`, 'utf8')) as Record<
		string,
		unknown
	>;

/** Serves three invented players, two of them Rares, and saves the given collection and stars. */
async function ownCards(
	page: Page,
	collection: Record<string, number>,
	favourites: string[] = []
): Promise<void> {
	const tavi = await example('player.outfield.json');
	const players = [
		tavi,
		await example('player.goalkeeper.json'),
		{ ...tavi, name: 'players/kit-harlow', displayName: 'Kit Harlow', cardNumber: 10 }
	];
	const clubs = [await example('club.example.json')];
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs } }));
	await page.route('**/api/v1/photos/**', (route) => route.fulfill({ status: 404 }));
	const state = { ...createPlayerState(), collection, favourites };
	await page.addInitScript(
		([key, value]) => {
			// Only the first load seeds the state, so a reload keeps what the game saved.
			if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
}

const saved = (page: Page): Promise<PlayerState> =>
	page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}') as PlayerState, STATE_KEY);

/** Another tab saves, so this tab's next save is refused. */
const saveInAnotherTab = (page: Page): Promise<void> =>
	page.evaluate((key) => {
		localStorage.setItem(key, (localStorage.getItem(key) ?? '') + ' ');
	}, STATE_KEY);

// A trading grid wiggles, and Playwright waits for a still target.
test.use({ reducedMotion: 'reduce' });

const WORDS = {
	favourite: 'That is a favourite. Take the star off before you trade it.',
	otherTab: 'The game is open in another tab, so your cards were not saved here.'
};

test('trading a double saves, and a reload shows the new card', async ({ page }) => {
	await ownCards(page, { 'tavi-brightwell': 2 });
	await page.goto('/cards');
	await page.getByRole('button', { name: 'Trade', exact: true }).click();
	await page.getByRole('button', { name: /Trade Tavi Brightwell/ }).click();

	await expect(page.getByRole('dialog', { name: 'Trade done' })).toBeVisible();
	await page.getByRole('button', { name: 'Nice' }).click();
	expect((await saved(page)).collection).toEqual({ 'tavi-brightwell': 1, 'kit-harlow': 1 });

	await page.reload();
	await expect(page.getByRole('button', { name: /Kit Harlow/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /Tavi Brightwell/ })).toBeVisible();
});

test('trading the last copy of a favourite is refused with the prototype words', async ({
	page
}) => {
	await ownCards(page, { 'tavi-brightwell': 1 }, ['tavi-brightwell']);
	await page.goto('/cards');
	await page.getByRole('button', { name: 'Trade', exact: true }).click();
	await page.getByRole('button', { name: /Trade Tavi Brightwell/ }).click();

	await expect(page.getByRole('status')).toHaveText(WORDS.favourite);
	await expect(page.getByRole('dialog')).toBeHidden();
	expect((await saved(page)).collection).toEqual({ 'tavi-brightwell': 1 });
});

test('starring and unstarring saves and survives a reload', async ({ page }) => {
	await ownCards(page, { 'tavi-brightwell': 1 });
	await page.goto('/cards');
	await page.getByRole('button', { name: /Look at Tavi Brightwell/ }).click();
	const star = page.getByRole('button', { name: '★ Favourite', exact: true });

	await star.click();
	await expect(page.getByRole('status')).toHaveText('Tavi Brightwell is now a favourite');
	expect((await saved(page)).favourites).toEqual(['tavi-brightwell']);
	await page.reload();
	await page.getByRole('button', { name: /Look at Tavi Brightwell/ }).click();
	await expect(star).toHaveAttribute('aria-pressed', 'true');

	await star.click();
	await expect(page.getByRole('status')).toHaveText('Star removed');
	expect((await saved(page)).favourites).toEqual([]);
	await page.reload();
	await page.getByRole('button', { name: /Look at Tavi Brightwell/ }).click();
	await expect(star).toHaveAttribute('aria-pressed', 'false');
});

test('an unstar whose save is refused says so and keeps the star', async ({ page }) => {
	await ownCards(page, { 'tavi-brightwell': 1 }, ['tavi-brightwell']);
	await page.goto('/cards');
	await page.getByRole('button', { name: /Look at Tavi Brightwell/ }).click();
	await saveInAnotherTab(page);
	await page.getByRole('button', { name: '★ Favourite', exact: true }).click();

	await expect(page.getByRole('status')).toHaveText(WORDS.otherTab);
	await expect(page.getByRole('button', { name: '★ Favourite', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('a trade refused in another tab is undone on screen with the notice', async ({ page }) => {
	await ownCards(page, { 'tavi-brightwell': 2 });
	await page.goto('/cards');
	await page.getByRole('button', { name: 'Trade', exact: true }).click();
	await saveInAnotherTab(page);
	await page.getByRole('button', { name: /Trade Tavi Brightwell/ }).click();

	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page.getByText('Kit Harlow')).toHaveCount(0);
	await expect(page.locator('.banner').filter({ hasText: WORDS.otherTab })).toBeVisible();
	await expect(
		page.getByRole('button', { name: /Trade Tavi Brightwell, you have 2/ })
	).toBeVisible();
});
