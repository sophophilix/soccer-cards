import { expect, test, type Page } from '@playwright/test';

const MIN_TARGET_PX = 44;
const NARROW_PHONE = { width: 320, height: 568 };

/** Describes every link and button on the page that is smaller than the minimum target. */
async function findSmallTargets(page: Page): Promise<string[]> {
	return page.locator('a, button').evaluateAll(
		(elements, minPx) =>
			elements
				.map((element) => ({ name: element.textContent, box: element.getBoundingClientRect() }))
				.filter(({ box }) => box.width < minPx || box.height < minPx)
				.map(({ name, box }) => `${name}: ${String(box.width)} by ${String(box.height)}`),
		MIN_TARGET_PX
	);
}

test('every link and button on the home page is at least 44 pixels each way', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Packs');

	expect(await findSmallTargets(page)).toEqual([]);
});

test('every link and button on the not-found page is at least 44 pixels each way', async ({
	page
}) => {
	await page.goto('/no-such-page');
	await expect(page.getByRole('link', { name: 'Go to Packs' })).toBeVisible();

	expect(await findSmallTargets(page)).toEqual([]);
});

test('a short link inside a sentence is at least 44 pixels each way', async ({ page }) => {
	await page.goto('/');
	// The coin count is drawn by the browser after the app has taken over the page. Nodes added
	// before that are thrown away when it does.
	await expect(page.getByText(/^\d+ coins?$/)).toBeVisible();
	await page.locator('main').evaluate((main) => {
		const sentence = document.createElement('p');
		const link = document.createElement('a');
		link.href = '/';
		link.textContent = 'x';
		sentence.append('Tap ', link, ' to go to the start.');
		main.append(sentence);
	});
	await expect(page.getByRole('link', { name: 'x' })).toBeVisible();

	expect(await findSmallTargets(page)).toEqual([]);
});

test('the not-found page has no sideways scroll at 320 pixels wide', async ({ page }) => {
	await page.setViewportSize(NARROW_PHONE);
	await page.goto('/no-such-page');
	await expect(page.getByRole('link', { name: 'Go to Packs' })).toBeVisible();

	const overflowPx = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);

	expect(overflowPx).toBeLessThanOrEqual(0);
});
