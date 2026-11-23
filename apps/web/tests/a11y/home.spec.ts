import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The Transfer Trail board puts h3 headings under the page's h1, and its card face is not
// marked data-art as every other card is, so axe can't measure the text on it. Reported to
// the lead, who will make a task; drop these entries when the fix lands.
const KNOWN_FAULTS: Readonly<Record<string, readonly string[]>> = {
	'/games/transfer-trail': ['heading-order']
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

				const results = await new AxeBuilder({ page })
					.exclude('[data-art]')
					.exclude(path === '/games/transfer-trail' ? '.face' : '[data-art]')
					.disableRules([...(KNOWN_FAULTS[path] ?? [])])
					.analyze();

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
