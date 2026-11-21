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
		await page.getByRole('button', { name: 'Open pack' }).click();
		await page.getByRole('button', { name: 'Skip to all cards' }).click();

		await page.reload();

		await expect(page.getByRole('heading', { name: 'Your 10 cards' })).toBeVisible();
		await page.getByRole('button', { name: 'Add to my collection' }).click();
		await page.reload();
		await expect(page.getByText('Cards in your collection: 10')).toBeVisible();
	});

	test('a double tap on Open opens one pack', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Open pack' })).toBeEnabled();

		await page.getByRole('button', { name: 'Open pack' }).evaluate((button: HTMLElement) => {
			button.click();
			button.click();
		});

		await expect(page.getByRole('heading', { name: 'Card 1 of 10' })).toBeVisible();
		const saved = await page.evaluate((key) => localStorage.getItem(key), STATE_KEY);
		expect(JSON.parse(saved ?? '{}')).toMatchObject({ freePacks: 1 });
	});

	test('says so when the device cannot save progress, and still opens the pack', async ({
		page
	}) => {
		await page.addInitScript(() => {
			Object.defineProperty(window, 'localStorage', {
				get: () => {
					throw new Error('blocked');
				}
			});
		});
		await page.goto('/');

		await expect(page.getByText("Your cards can't be saved on this device.")).toBeVisible();
		await page.getByRole('button', { name: 'Open pack' }).click();

		await expect(page.getByRole('heading', { name: 'Card 1 of 10' })).toBeVisible();
	});

	test('says so when the device is full', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Open pack' })).toBeEnabled();
		await page.evaluate(() => {
			Storage.prototype.setItem = () => {
				throw new DOMException('full', 'QuotaExceededError');
			};
		});

		await page.getByRole('button', { name: 'Open pack' }).click();

		await expect(
			page.getByText('This device is full, so your cards were not saved.')
		).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Card 1 of 10' })).toBeVisible();
	});

	test('says so when another tab changed the saved cards', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Open pack' })).toBeEnabled();
		await page.evaluate((key) => {
			localStorage.setItem(key, `${localStorage.getItem(key) ?? ''} `);
		}, STATE_KEY);

		await page.getByRole('button', { name: 'Open pack' }).click();

		await expect(page.getByText('The game is open in another tab')).toBeVisible();
	});

	test('turns a card to its back with the real ratings', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open pack' }).click();

		await page.getByRole('button', { name: /showing the front/ }).click();

		await expect(page.getByTestId('back').getByText('PACE')).toBeVisible();
	});

	test('the Packs screen has no accessibility violation while a card shows', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open pack' }).click();
		await expect(page.getByRole('heading', { name: 'Card 1 of 10' })).toBeVisible();

		const results = await new AxeBuilder({ page }).exclude('[data-art]').analyze();

		expect(results.violations).toEqual([]);
	});

	test('keeps focus on the next step with the keyboard alone, and clears the announcement', async ({
		page
	}) => {
		await page.goto('/');
		const open = page.getByRole('button', { name: 'Open pack' });
		await expect(open).toBeEnabled();

		await open.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name: 'Next card' })).toBeFocused();

		await page.getByRole('button', { name: 'Skip to all cards' }).focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name: 'Add to my collection' })).toBeFocused();

		await page.keyboard.press('Enter');
		await expect(page.getByRole('status')).toHaveText('10 cards added to your collection.');
		await expect(page.getByRole('heading', { name: 'Open a pack' })).toBeFocused();

		await page.getByRole('button', { name: 'Open pack' }).focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('status')).toHaveText('');
	});
});
