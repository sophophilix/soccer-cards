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

test('Packs to Cards to a flipped card with its credit, then Escape returns focus', async ({
	page
}) => {
	await ownCards(page);
	await page.goto('/packs');
	await page
		.getByRole('navigation', { name: 'Views' })
		.getByRole('link', { name: 'Cards' })
		.click();

	const tile = page.getByRole('button', { name: /Tavi Brightwell.*2 copies/ });
	const first = page.getByRole('listitem').first().getByRole('button');
	await expect(first).toHaveAccessibleName(/Juno Marshwick/);
	await expect(page.getByText('Unknown card')).toBeVisible();
	await tile.click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('button', { name: /Press to see the back/ }).click();
	await expect(dialog.getByText(/Ina Vented/)).toBeVisible();
	await page.keyboard.press('Escape');

	await expect(dialog).toBeHidden();
	await expect(tile).toBeFocused();
});

test('an empty collection points to Packs', async ({ page }) => {
	await page.goto('/cards');

	await expect(page.getByRole('main').getByRole('link', { name: 'Packs' })).toBeVisible();
});

test('the screen and its dialog have no accessibility violation, and Close closes it', async ({
	page
}) => {
	await ownCards(page);
	await page.goto('/cards');
	await expect(page.getByRole('button', { name: /Tavi Brightwell/ })).toBeVisible();
	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

	await page.getByRole('button', { name: /Tavi Brightwell/ }).click();
	await expect(page.getByRole('dialog')).toBeVisible();

	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

	await page.getByRole('button', { name: 'Close' }).click();

	await expect(page.getByRole('dialog')).toBeHidden();
});
