import { expect, test, type Page } from '@playwright/test';

const CARDS_IN_PACK = 10;
const TIERS = ['BASE', 'RARE', 'LEGEND', 'ICON'] as const;
const OUTFIELD_RATINGS = {
	pace: 80,
	shooting: 70,
	passing: 60,
	dribbling: 75,
	defending: 40,
	physical: 65
};

function aSummary(number: number, tier: (typeof TIERS)[number]): unknown {
	return {
		name: `players/test-player-${String(number)}`,
		displayName: `Test Player ${String(number)}`,
		state: 'ACTIVE',
		club: 'clubs/test-club',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier,
		cardNumber: number,
		outfieldRatings: OUTFIELD_RATINGS,
		playStats: { attack: 70 + number, defence: 40, control: 60, overall: 60 + number }
	};
}

/** Serves an invented card set from the site's own paths, so the tests need no published data. */
async function serveCards(page: Page): Promise<void> {
	const players = Array.from({ length: 8 }, (_, index) =>
		aSummary(index + 1, TIERS[Math.min(index, TIERS.length - 1)] ?? 'BASE')
	);
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs: [club] } }));
}

test.describe('with the cards served', () => {
	test.beforeEach(async ({ page }) => {
		await serveCards(page);
	});

	test('shows both packs with their price and contents', async ({ page }) => {
		await page.goto('/packs');

		await expect(page.getByRole('heading', { name: 'Open a pack' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Open free pack (2 left)' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Need 20 coins' })).toBeDisabled();
		await expect(
			page.getByRole('button', { name: 'Jumbo pack of 50 cards: 40 base and 10 lucky cards' })
		).toBeVisible();
		await expect(page.getByText('Rare 85 in 100')).toBeVisible();
	});

	test('reveals the cards one at a time with the best last, and adds them', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();
		await expect(
			page.getByTestId('spot').getByRole('button', { name: /card\. Press for the next card\./ })
		).toBeVisible();
		await page.getByRole('button', { name: 'Skip to all cards' }).click();
		await expect(
			page.getByRole('heading', { name: `Your ${String(CARDS_IN_PACK)} cards` })
		).toBeVisible();
		await page.getByRole('button', { name: 'Add to my collection' }).click();

		await expect(page).toHaveURL(/\/cards$/);
		await page.goto('/packs');
		await expect(page.getByRole('button', { name: 'Open free pack (1 left)' })).toBeVisible();
	});

	test('shows the best card last', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();

		for (let step = 0; step < CARDS_IN_PACK - 1; step += 1) {
			await page.getByRole('button', { name: 'Next card' }).click();
		}

		await expect(page.getByText('Card 10 of 10')).toBeVisible();
		await expect(page.getByText(/^(Rare|Legend|Icon)$/)).toBeVisible();
	});

	test('shows the cards without animation when reduced motion is asked for', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();

		await expect(page.getByTestId('spot').locator('.big')).toHaveCSS('animation-name', 'none');
	});
});

test.describe('when the cards cannot be loaded', () => {
	test('shows a plain message, and Try again loads them', async ({ page }) => {
		let isServing = false;
		await serveCards(page);
		await page.route('**/api/v1/players.json', (route) =>
			isServing ? route.fallback() : route.fulfill({ status: 500, body: '' })
		);
		await page.goto('/');

		await expect(page.getByText("We can't get the cards right now.")).toBeVisible();
		isServing = true;
		await page.getByRole('button', { name: 'Try again' }).click();

		await expect(page.getByRole('button', { name: 'Open free pack (2 left)' })).toBeVisible();
	});
});
