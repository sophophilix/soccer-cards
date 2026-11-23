import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Known faults on the Transfer Trail board: h3 headings under the h1, and a card face not
// marked data-art. T-0168 fixes both and removes this map.
const KNOWN_FAULTS: Readonly<
	Record<string, { readonly rules: readonly string[]; readonly exclude: readonly string[] }>
> = {
	'/games/transfer-trail': { rules: ['heading-order'], exclude: ['.face'] }
};

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		for (const path of [
			'/',
			'/packs',
			'/match',
			'/games',
			'/games/transfer-trail',
			'/cards',
			'/guide'
		]) {
			test(`${path} has no accessibility violation`, async ({ page }) => {
				await page.goto(path);
				await page.evaluate(async () => document.fonts.ready);
				// Scan the board, not the line shown while Transfer Trail loads.
				await expect(page.getByText('Getting the players ready…')).toHaveCount(0);

				const fault = KNOWN_FAULTS[path];
				const scan = new AxeBuilder({ page }).exclude('[data-art]');
				// An array in one exclude() means a path into frames, so each is its own call.
				for (const selector of fault?.exclude ?? []) scan.exclude(selector);
				const results = await scan.disableRules([...(fault?.rules ?? [])]).analyze();

				expect(results.violations).toEqual([]);
				// Axe sets aside text it can't measure, such as text on the stripes. None may be.
				expect(results.incomplete.filter((check) => check.id === 'color-contrast')).toEqual([]);
			});
		}

		test('the not-found page has no accessibility violation', async ({ page }) => {
			await page.goto('/no-such-page');
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');

			const results = await new AxeBuilder({ page }).exclude('[data-art]').analyze();

			expect(results.violations).toEqual([]);
		});
	});
}
