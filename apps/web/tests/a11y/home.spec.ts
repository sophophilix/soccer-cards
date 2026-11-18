import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		test('the home page has no accessibility violation', async ({ page }) => {
			await page.goto('/');
			await page.evaluate(async () => document.fonts.ready);

			const results = await new AxeBuilder({ page }).analyze();

			expect(results.violations).toEqual([]);
			// Axe sets aside text it can't measure. None may be set aside here.
			expect(results.incomplete.filter((check) => check.id === 'color-contrast')).toEqual([]);
		});

		test('the not-found page has no accessibility violation', async ({ page }) => {
			await page.goto('/no-such-page');
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');

			const results = await new AxeBuilder({ page }).analyze();

			expect(results.violations).toEqual([]);
		});
	});
}
