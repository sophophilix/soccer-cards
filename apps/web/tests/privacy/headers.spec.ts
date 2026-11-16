import { expect, test } from '@playwright/test';

// 'self', 'none', a keyword, a hash or a nonce. A host, a scheme or * is none of these.
const QUOTED_SOURCE = /^'[A-Za-z0-9+/=-]+'$/;

/** Lists the sources in a policy that could let in another host. */
function findOtherHosts(policy: string): string[] {
	const sources = policy.split(';').flatMap((directive) => directive.trim().split(/\s+/).slice(1));
	return sources.filter((source) => !QUOTED_SOURCE.test(source));
}

test('the preview sends a Content Security Policy for this origin only', async ({ request }) => {
	const response = await request.get('/');
	const policy = response.headers()['content-security-policy'] ?? '';

	expect(policy).toContain("default-src 'self'");
	expect(policy).toContain("frame-ancestors 'none'");
	expect(policy).not.toContain('unsafe-eval');
	expect(findOtherHosts(policy)).toEqual([]);
});

for (const path of ['/', '/no-such-page']) {
	test(`the page at ${path} narrows inline scripts to the hashes SvelteKit wrote`, async ({
		page
	}) => {
		await page.goto(path);

		const tag = page.locator('meta[http-equiv="content-security-policy"]');
		const policy = (await tag.getAttribute('content')) ?? '';

		expect(policy).toMatch(/default-src 'self'.*script-src 'self' 'sha256-/);
		expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
		expect(findOtherHosts(policy)).toEqual([]);
	});
}

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
