import { expect, test } from '@playwright/test';

test('the home page requests no other host', async ({ page, baseURL }) => {
	const requestedOrigins = new Set<string>();
	page.on('request', (request) => requestedOrigins.add(new URL(request.url()).origin));

	await page.goto('/', { waitUntil: 'networkidle' });

	expect([...requestedOrigins]).toEqual([new URL(baseURL ?? '').origin]);
});

test('the home page sets no cookie', async ({ page, context }) => {
	await page.goto('/', { waitUntil: 'networkidle' });

	expect(await context.cookies()).toEqual([]);
});

test('the home page runs with no Content Security Policy violation', async ({ page }) => {
	const consoleErrors: string[] = [];
	page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()));

	await page.goto('/', { waitUntil: 'networkidle' });

	expect(consoleErrors).toEqual([]);
});

test('a move between pages without a reload breaks no security policy', async ({ page }) => {
	const consoleMessages: string[] = [];
	page.on('console', (message) => consoleMessages.push(message.text()));
	await page.goto('/no-such-page');

	// press() focuses the link first. A WebKit click fails when the laptop's display is off.
	await page.getByRole('link', { name: 'Go to Packs' }).press('Enter');

	// SvelteKit fills its announcer, the element with the hashed style, only on such a move.
	await expect(page.locator('#svelte-announcer')).toHaveText('Packs · Soccer Cards');
	expect(consoleMessages.join('\n')).not.toContain('Content Security Policy');
});
