import { expect, test, type Page } from '@playwright/test';

/** Checks the page shows one view: its address, title, single heading and current tab. */
async function expectView(page: Page, name: string): Promise<void> {
	await expect(page).toHaveURL(new RegExp(`/${name.toLowerCase()}$`));
	await expect(page).toHaveTitle(`${name} · Soccer Cards`);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
	const current = page.getByRole('navigation', { name: 'Views' }).locator('[aria-current="page"]');
	await expect(current).toHaveText(name);
}

/** Finds a tab in the bar by its view's name. */
function tab(page: Page, name: string): ReturnType<Page['getByRole']> {
	return page.getByRole('navigation', { name: 'Views' }).getByRole('link', { name });
}

/** WebKit moves focus to a link only with Alt held, as Safari does by default. */
function focusNextKey(browserName: string): string {
	return browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
}

test.describe('on a touch screen', () => {
	test.use({ hasTouch: true });

	test('a tap on each tab moves to its view', async ({ page }) => {
		await page.goto('/packs');

		await tab(page, 'Match').tap();
		await expectView(page, 'Match');
		await tab(page, 'Cards').tap();
		await expectView(page, 'Cards');
		await tab(page, 'Guide').tap();
		await expectView(page, 'Guide');
	});
});

test('the keyboard alone reaches every tab and moves to its view', async ({
	page,
	browserName
}) => {
	await page.goto('/guide');
	const key = focusNextKey(browserName);

	await page.keyboard.press(key);
	await expect(tab(page, 'Packs')).toBeFocused();
	await expect(tab(page, 'Packs')).toHaveCSS('outline-style', 'solid');
	await page.keyboard.press(key);
	await page.keyboard.press(key);
	await page.keyboard.press('Enter');

	await expectView(page, 'Cards');
});

test('back after Packs, Cards and Guide returns to Cards', async ({ page }) => {
	await page.goto('/packs');
	await tab(page, 'Cards').press('Enter');
	await expectView(page, 'Cards');
	await tab(page, 'Guide').press('Enter');
	await expectView(page, 'Guide');

	await page.goBack();

	await expectView(page, 'Cards');
});

test('a reload on Cards stays on Cards', async ({ page }) => {
	await page.goto('/cards');

	await page.reload();

	await expectView(page, 'Cards');
});

test.describe('with reduced motion requested', () => {
	test.use({ reducedMotion: 'reduce' });

	test('a view change runs no animation', async ({ page }) => {
		await page.goto('/packs');

		await tab(page, 'Guide').press('Enter');
		await expectView(page, 'Guide');

		expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
	});
});
