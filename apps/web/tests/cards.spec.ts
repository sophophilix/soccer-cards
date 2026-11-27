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
	await expect(items.first().getByRole('button')).toHaveAccessibleName(/Juno Marshwick/);
	await expect(items.nth(1).getByRole('button')).toHaveAccessibleName(/you have 2/);
	await expect(items.nth(2)).toContainText('Unknown card');
});

test('a card opens large, flips to its back with the credit, and Escape returns focus', async ({
	page
}) => {
	await ownCards(page);
	await page.goto('/cards');
	const tile = page.getByRole('button', { name: /Juno Marshwick/ });

	await tile.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: /see the back/ }).click();
	await expect(dialog).toContainText('Photo:');
	expect((await new AxeBuilder({ page }).exclude('[data-art]').analyze()).violations).toEqual([]);
	await page.keyboard.press('Escape');

	await expect(dialog).toBeHidden();
	await expect(tile).toBeFocused();
});

test('the screen has no accessibility violation', async ({ page }) => {
	await ownCards(page);
	await page.goto('/cards');
	await expect(page.getByRole('listitem')).toHaveCount(3);

	expect((await new AxeBuilder({ page }).exclude('[data-art]').analyze()).violations).toEqual([]);
});
