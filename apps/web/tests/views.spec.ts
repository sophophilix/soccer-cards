import { expect, test, type Page } from '@playwright/test';

const MIN_TARGET_PX = 44;
const NARROW_PHONE = { width: 320, height: 568 };

/** Checks the page shows one view: its address, title, single heading and current tab. */
async function expectView(
	page: Page,
	name: string,
	shown: { path: string; title: string } = { path: name.toLowerCase(), title: name }
): Promise<void> {
	await expect(page).toHaveURL(new RegExp(`/${shown.path}$`));
	await expect(page).toHaveTitle(`${shown.title} · Soccer Cards`);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(shown.title);
	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
	const current = page.getByRole('navigation', { name: 'Views' }).locator('[aria-current="page"]');
	// The Cards tab adds the number of cards held, as in the prototype: "Cards (10)".
	await expect(current).toHaveText(new RegExp(`^${name}(\\s\\(\\d+\\))?$`));
}

/** Finds a tab in the bar by its view's name. */
function tab(page: Page, name: string): ReturnType<Page['getByRole']> {
	return page.getByRole('navigation', { name: 'Views' }).getByRole('link', { name });
}

/** WebKit moves focus to a link only with Alt held, as Safari does by default. */
function focusNextKey(browserName: string): string {
	return browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
}

for (const name of ['Packs', 'Match', 'Games', 'Cards', 'Guide']) {
	test(`/${name.toLowerCase()} shows the ${name} view as its own page`, async ({ page }) => {
		await page.goto(`/${name.toLowerCase()}`);

		await expectView(page, name);
	});
}

test('/games/transfer-trail shows its own page', async ({ page }) => {
	await page.goto('/games/transfer-trail');

	await expectView(page, 'Games', { path: 'games/transfer-trail', title: 'Transfer Trail' });
});

test('every tab is at least 44 pixels each way at 320 pixels wide @engines', async ({ page }) => {
	await page.setViewportSize(NARROW_PHONE);
	await page.goto('/packs');

	const boxes = await page
		.getByRole('navigation', { name: 'Views' })
		.getByRole('link')
		.evaluateAll((links) => links.map((link) => link.getBoundingClientRect()));

	expect(boxes.filter((box) => box.width < MIN_TARGET_PX || box.height < MIN_TARGET_PX)).toEqual(
		[]
	);
});

test.describe('on a touch screen @engines', () => {
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
	await page.keyboard.press(key);
	await page.keyboard.press('Enter');

	await expectView(page, 'Cards');
});

for (const { colorScheme, focus } of [
	{ colorScheme: 'light', focus: 'rgb(53, 134, 255)' },
	{ colorScheme: 'dark', focus: 'rgb(61, 139, 255)' }
] as const) {
	test.describe(`with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		test('a focused tab has that theme’s focus ring colour', async ({ page }) => {
			await page.goto('/packs');

			await tab(page, 'Match').focus();

			await expect(tab(page, 'Match')).toHaveCSS('outline-color', focus);
		});
	});
}

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
