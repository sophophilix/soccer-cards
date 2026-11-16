import { expect, test } from '@playwright/test';

const OTHER_HOST = /https?:|\*/;

test('the preview sends a Content Security Policy for this origin only', async ({ request }) => {
	const response = await request.get('/');
	const policy = response.headers()['content-security-policy'] ?? '';

	expect(policy).toContain("default-src 'self'");
	expect(policy).toContain("frame-ancestors 'none'");
	expect(policy).not.toContain('unsafe-eval');
	expect(policy).not.toMatch(OTHER_HOST);
});

test('each page narrows inline scripts to the hashes SvelteKit wrote', async ({ page }) => {
	await page.goto('/');

	const policy = page.locator('meta[http-equiv="content-security-policy"]');

	await expect(policy).toHaveAttribute('content', /script-src 'self' 'sha256-/);
	await expect(policy).not.toHaveAttribute('content', /unsafe-inline|unsafe-eval/);
});

test('the preview sends the other security headers', async ({ request }) => {
	const headers = (await request.get('/')).headers();

	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(headers['permissions-policy']).toContain('camera=()');
	expect(headers['permissions-policy']).toContain('microphone=()');
	expect(headers['permissions-policy']).toContain('geolocation=()');
});

test('a file with a hash in its name is cached for a year', async ({ page, request }) => {
	await page.goto('/');
	const hashedFile = await page.locator('link[rel="modulepreload"]').first().getAttribute('href');

	const response = await request.get(hashedFile ?? '');

	expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});
