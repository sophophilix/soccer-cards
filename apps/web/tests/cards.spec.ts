import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { readFile } from 'node:fs/promises';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

// No players are published yet (T-0084), so the test serves invented ones from the schema examples.
const example = async (name: string): Promise<unknown> =>
	JSON.parse(await readFile(`../../packages/schema/schemas/v1/examples/${name}`, 'utf8'));

/** Serves two players and a club on the site's origin, and saves a collection with a card that is gone. */
async function ownCards(page: Page): Promise<void> {
	const players = [await example('player.outfield.json'), await example('player.goalkeeper.json')];
	const clubs = [await example('club.example.json')];
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs } }));
	await page.route('**/api/v1/photos/**', (route) => route.fulfill({ status: 404 }));
	const collection = { 'tavi-brightwell': 2, 'juno-marshwick': 1, 'removed-player': 1 };
	const text = JSON.stringify({ ...createPlayerState(), collection });
	await page.addInitScript(
		([key, value]) => {
			localStorage.setItem(key, value);
		},
		[STATE_KEY, text] as const
	);
}

test('Packs to Cards lists the highest tier first, with copies and an unknown card', async ({
	page
}) => {
	await ownCards(page);
	await page.goto('/packs');
	await page
		.getByRole('navigation', { name: 'Views' })
		.getByRole('link', { name: 'Cards' })
		.click();

	const items = page.getByRole('listitem');
	await expect(items.first().getByRole('img')).toHaveAccessibleName(/Juno Marshwick/);
	await expect(items.nth(1)).toContainText(/×2\s*copies/);
	await expect(items.nth(2)).toContainText('Unknown card');
});

test('an empty collection points to Packs', async ({ page }) => {
	await page.goto('/cards');

	await expect(page.getByRole('main').getByRole('link', { name: 'Packs' })).toBeVisible();
});

test('the screen has no accessibility violation', async ({ page }) => {
	await ownCards(page);
	await page.goto('/cards');
	await expect(page.getByRole('listitem')).toHaveCount(3);

	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
