import { expect, test } from '@playwright/test';

const MIN_TARGET_PX = 44;

test('Games opens from the tab bar and lists Transfer Trail', async ({ page }) => {
	await page.goto('/packs');

	await page
		.getByRole('navigation', { name: 'Views' })
		.getByRole('link', { name: 'Games' })
		.click();

	await expect(page).toHaveURL(/\/games$/);
	await expect(page.getByText('Pick a game. You win coins for playing.')).toBeVisible();
	const game = page.getByRole('link', { name: /Transfer Trail/ });
	await expect(game).toContainText('Put a player’s clubs in the order they joined them.');
	await expect(game).toHaveAttribute('href', '/games/transfer-trail');
});

test('the Games tab is current on /games/', async ({ page }) => {
	await page.goto('/games/');

	const current = page.getByRole('navigation', { name: 'Views' }).locator('[aria-current="page"]');
	await expect(current).toHaveText('Games');
});

for (const width of [320, 360, 390]) {
	test(`five tabs fit at ${String(width)} pixels with no sideways scroll`, async ({ page }) => {
		await page.setViewportSize({ width, height: 700 });
		await page.goto('/games');

		const tabs = page.getByRole('navigation', { name: 'Views' }).getByRole('link');
		await expect(tabs).toHaveText([/^Packs/, /^Match/, /^Games/, /^Cards/, /^Guide/]);
		const boxes = await tabs.evaluateAll((links) =>
			links.map((link) => link.getBoundingClientRect())
		);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);

		expect(boxes.filter((b) => b.width < MIN_TARGET_PX || b.height < MIN_TARGET_PX)).toEqual([]);
		expect(overflow).toBeLessThanOrEqual(0);
		expect(Math.max(...boxes.map((b) => b.right))).toBeLessThanOrEqual(width);
	});
}
