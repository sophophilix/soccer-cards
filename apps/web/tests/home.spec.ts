import { expect, test } from '@playwright/test';

const NOT_FOUND_STATUS = 404;
const PACKS_LINE = 'Open packs of cards here. Coming soon.';

test('the home page shows the Packs view and one line of text', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Packs');
	await expect(page.getByRole('heading')).toHaveCount(1);
	await expect(page.getByText(PACKS_LINE)).toBeVisible();
});

test('the home page has a title and a language', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle('Packs · Soccer Cards');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('a path that does not exist shows the not-found page', async ({ page }) => {
	const response = await page.goto('/no-such-page');

	expect(response?.status()).toBe(NOT_FOUND_STATUS);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
	await expect(page.getByRole('link', { name: 'Go to Packs' })).toHaveAttribute('href', '/packs');
});

test.describe('with JavaScript turned off', () => {
	test.use({ javaScriptEnabled: false });

	test('the home page still shows its heading', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Packs');
	});
});
