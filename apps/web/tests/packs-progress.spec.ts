import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const STATE_KEY = 'soccer-cards:player-state';
const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };

/** Serves an invented card set from the site's own paths, so the tests need no published data. */
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

test.describe('the Packs screen guards', () => {
	test.beforeEach(async ({ page }) => {
		await serveCards(page);
	});

	test('keeps an opened pack across a reload', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: /^Open free pack/ }).click();
		await page.getByRole('button', { name: 'Skip to all cards' }).click();

		await page.reload();

		await expect(page.getByRole('heading', { name: 'Your 10 cards' })).toBeVisible();
		await page.getByRole('button', { name: 'Add to my collection' }).click();
		await expect(page).toHaveURL(/\/cards$/);
		await page.reload();
		await expect(page.getByRole('link', { name: 'Cards (10)' })).toBeVisible();
	});

	test('says so when another tab changed the saved cards', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: /^Open free pack/ })).toBeEnabled();
		await page.evaluate((key) => {
			localStorage.setItem(key, `${localStorage.getItem(key) ?? ''} `);
		}, STATE_KEY);

		await page.getByRole('button', { name: /^Open free pack/ }).click();

		await expect(page.getByText('The game is open in another tab')).toBeVisible();
	});

	test('turns a card to its back with the real ratings', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: /^Open free pack/ }).click();
		await page.getByRole('button', { name: 'Skip to all cards' }).click();

		// As in the prototype, a card turns over in the large view from the summary.
		await page
			.getByRole('button', { name: /^Look at / })
			.first()
			.click();
		await page.getByRole('button', { name: /showing the front/ }).click();

		await expect(page.getByTestId('back').getByText('PACE')).toBeVisible();
	});

	test('the Packs screen has no accessibility violation while a card shows', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: /^Open free pack/ }).click();
		await expect(page.getByText('Card 1 of 10')).toBeVisible();

		const results = await new AxeBuilder({ page }).exclude('[data-art]').analyze();

		expect(results.violations).toEqual([]);
	});

	test('keeps focus on the next step with the keyboard alone, then goes to Cards', async ({
		page
	}) => {
		await page.goto('/');
		const open = page.getByRole('button', { name: /^Open free pack/ });
		await expect(open).toBeEnabled();

		await open.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name: 'Next card', exact: true })).toBeFocused();

		await page.getByRole('button', { name: 'Skip to all cards' }).focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name: 'Add to my collection' })).toBeFocused();

		// Adding goes to the Cards view, as in the prototype.
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/cards$/);
	});
});
