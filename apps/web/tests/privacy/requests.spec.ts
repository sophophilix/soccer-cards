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
