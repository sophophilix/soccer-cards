import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the home page has no accessibility violation', async ({ page }) => {
	await page.goto('/');

	const results = await new AxeBuilder({ page }).analyze();

	expect(results.violations).toEqual([]);
});

test('the not-found page has no accessibility violation', async ({ page }) => {
	await page.goto('/no-such-page');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');

	const results = await new AxeBuilder({ page }).analyze();

	expect(results.violations).toEqual([]);
});
