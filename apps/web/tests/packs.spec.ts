import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PLAYERS = '**/api/v1/players.json';
const NOT_FOUND_STATUS = 404;

/** One invented player summary with the fields the card set reads. */
function aPlayer(slug: string, tier: string): Record<string, unknown> {
	return {
		name: `players/${slug}`,
		displayName: 'Invented Player',
		nationalTeamCode: 'ENG',
		state: 'ACTIVE',
		position: 'MIDFIELDER',
		tier,
		playStats: { attack: 70, defence: 55, control: 66, overall: 68 }
	};
}

/** Answers the site's players.json with invented players of every tier, until T-0084 publishes one. */
async function serveCardSet(page: Page): Promise<void> {
	const base = ['ada', 'ben', 'cleo', 'dev', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jo'];
	const players = [
		...base.map((slug) => aPlayer(`${slug}-base`, 'BASE')),
		aPlayer('rio-rare', 'RARE'),
		aPlayer('lea-legend', 'LEGEND'),
		aPlayer('ike-icon', 'ICON')
	];
	await page.route(PLAYERS, (route) => route.fulfill({ json: { players } }));
}

test('opens a free pack, adds its cards, and keeps them after a reload', async ({ page }) => {
	await serveCardSet(page);
	await page.goto('/packs');
	await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();
	await expect(page.getByRole('heading', { name: 'Card 1 of 10' })).toBeVisible();
	await page.getByRole('button', { name: 'Skip to all cards' }).click();
	await page.getByRole('button', { name: 'Add to my collection' }).click();
	await expect(page.getByRole('status')).toHaveText('10 cards added to your collection.');

	await page.reload();

	await expect(page.getByText('Cards in your collection: 10')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Open free pack (1 left)' })).toBeVisible();
});

test('shows an opened pack again after a reload, before its cards are added', async ({ page }) => {
	await serveCardSet(page);
	await page.goto('/packs');
	await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();

	await page.reload();

	await expect(page.getByRole('heading', { name: 'Your 10 cards' })).toBeVisible();
});

test('says plainly when the cards cannot load, and tries again', async ({ page }) => {
	await page.route(PLAYERS, (route) => route.fulfill({ status: NOT_FOUND_STATUS }));
	await page.goto('/packs');
	await expect(page.getByText("We can't get the cards right now.")).toBeVisible();
	await page.unroute(PLAYERS);
	await serveCardSet(page);

	await page.getByRole('button', { name: 'Try again' }).click();

	await expect(page.getByRole('button', { name: 'Open free pack (2 left)' })).toBeVisible();
});

test('opens a pack and says so when the device cannot save', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'localStorage', {
			get: () => {
				throw new DOMException('Blocked', 'SecurityError');
			}
		});
	});
	await serveCardSet(page);
	await page.goto('/packs');

	await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();

	await expect(page.getByRole('heading', { name: 'Card 1 of 10' })).toBeVisible();
	await expect(page.getByText("Your cards can't be saved on this device.")).toBeVisible();
});

test('shows each card without movement when reduced motion is asked for', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await serveCardSet(page);
	await page.goto('/packs');

	await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();

	const main = page.getByRole('main');
	await expect(main.getByRole('img').first()).toBeVisible();
	expect(await main.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test('the pack shelf and a revealed card have no accessibility violation', async ({ page }) => {
	await serveCardSet(page);
	await page.goto('/packs');
	await page.evaluate(async () => document.fonts.ready);
	const shelf = await new AxeBuilder({ page }).analyze();
	await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();
	await expect(page.getByRole('heading', { name: 'Card 1 of 10' })).toBeVisible();

	const reveal = await new AxeBuilder({ page }).analyze();

	expect(shelf.violations).toEqual([]);
	expect(reveal.violations).toEqual([]);
});
