import { expect, test, type Page } from '@playwright/test';

const OK_STATUS = 200;
const NARROW_PHONE = { width: 320, height: 568 };
const LIGHT_BACKGROUND = 'rgb(231, 240, 234)';
const DARK_BACKGROUND = 'rgb(12, 25, 20)';

/** Reads the first font family the browser computed for an element. */
async function readFirstFontFamily(page: Page, selector: string): Promise<string> {
	return page
		.locator(selector)
		.evaluate((element) => getComputedStyle(element).fontFamily.split(',')[0] ?? '');
}

/** Loads the home page and waits until the browser has every font it asked for. */
async function openHomeWithFonts(page: Page): Promise<void> {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.evaluate(async () => document.fonts.ready);
}

test('every font comes from the site as WOFF2 and answers 200 @engines', async ({
	page,
	baseURL
}) => {
	const fonts: { origin: string; isWoff2: boolean; status: number }[] = [];
	page.on('response', (response) => {
		if (response.request().resourceType() !== 'font') return;
		const url = new URL(response.url());
		fonts.push({
			origin: url.origin,
			isWoff2: url.pathname.endsWith('.woff2'),
			status: response.status()
		});
	});

	await openHomeWithFonts(page);

	const fromTheSite = { origin: new URL(baseURL ?? '').origin, isWoff2: true, status: OK_STATUS };
	// Bowlby One, the Latin part of Figtree, and Saira Condensed at 800, and at 600 where the
	// page uses it. Each comes from the site as WOFF2.
	expect(fonts.length).toBeGreaterThanOrEqual(3);
	expect(fonts).toEqual(fonts.map(() => fromTheSite));
});

test('the heading is in Bowlby One and the body text in Figtree @engines', async ({ page }) => {
	await openHomeWithFonts(page);

	expect(await readFirstFontFamily(page, 'h1')).toContain('Bowlby One');
	expect(await readFirstFontFamily(page, 'body')).toContain('Figtree');
	expect(await page.evaluate(() => document.fonts.check('400 24px "Bowlby One"'))).toBe(true);
	expect(await page.evaluate(() => document.fonts.check('400 16px "Figtree"'))).toBe(true);
});

test('every font shows fallback text while it loads @engines', async ({ page }) => {
	await openHomeWithFonts(page);

	const displays = await page.evaluate(() => [...document.fonts].map((font) => font.display));

	expect(new Set(displays)).toEqual(new Set(['swap']));
});

test('the page reads and fits at 320 pixels wide when no font file arrives @engines', async ({
	page
}) => {
	await page.route('**/*.woff2', (route) => route.abort());
	await page.setViewportSize(NARROW_PHONE);

	await page.goto('/', { waitUntil: 'networkidle' });

	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByRole('main')).toBeVisible();
	const overflowPx = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflowPx).toBeLessThanOrEqual(0);
});

for (const { colorScheme, background } of [
	{ colorScheme: 'light', background: LIGHT_BACKGROUND },
	{ colorScheme: 'dark', background: DARK_BACKGROUND }
] as const) {
	test.describe(`with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		test('the page takes its background from that theme', async ({ page }) => {
			await page.goto('/');

			await expect(page.locator('body')).toHaveCSS('background-color', background);
		});
	});
}
