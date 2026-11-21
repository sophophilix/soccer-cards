import { expect, test, type Page } from '@playwright/test';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };

/** Serves an invented card set from the site's own paths, so the test needs no published data. */
async function serveCards(page: Page): Promise<void> {
	const players = Array.from({ length: 8 }, (_, index) => ({
		name: `players/test-player-${String(index)}`,
		displayName: `Test Player ${String(index)}`,
		state: 'ACTIVE',
		club: 'clubs/test-club',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier: ['BASE', 'RARE', 'LEGEND', 'ICON'][Math.min(index, 3)],
		cardNumber: index + 1,
		outfieldRatings: RATINGS,
		playStats: { attack: 70, defence: 40, control: 60, overall: 60 }
	}));
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs: [club] } }));
}

test.describe('the masthead', () => {
	test.beforeEach(async ({ page }) => {
		await serveCards(page);
	});

	test('follows the cards held after a pack is added', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: /^Open free pack/ }).click();
		await page.getByRole('button', { name: 'Skip to all cards' }).click();

		await page.getByRole('button', { name: 'Add to my collection' }).click();

		await expect(page.getByRole('link', { name: 'Cards (10)' })).toBeVisible();
	});

	test('ignores a forged saved event and keeps showing the validated state', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: /^Open free pack/ }).click();
		await page.getByRole('button', { name: 'Skip to all cards' }).click();
		await page.getByRole('button', { name: 'Add to my collection' }).click();
		await expect(page.getByRole('link', { name: 'Cards (10)' })).toBeVisible();

		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent('soccer-cards:saved', { detail: { coins: 'x' } }));
			window.dispatchEvent(new CustomEvent('soccer-cards:saved', { detail: null }));
		});

		await expect(page.getByRole('link', { name: 'Cards (10)' })).toBeVisible();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});
});
