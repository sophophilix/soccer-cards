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

test('the response header allows scripts by hash, never every inline script', async ({
	request
}) => {
	const policy = (await request.get('/')).headers()['content-security-policy'] ?? '';
	const scriptSources = /script-src ([^;]*)/.exec(policy)?.[1] ?? '';

	expect(scriptSources).toMatch(/^'self' 'sha256-/);
	expect(scriptSources).not.toContain('unsafe-inline');
});

for (const { path, heading } of [
	{ path: '/', heading: 'Packs' },
	{ path: '/no-such-page', heading: 'Page not found' }
]) {
	// The <meta> tag is taken out, so only the response header is left to decide.
	test(`the header alone blocks an injected script at ${path} and runs the page's own`, async ({
		page
	}) => {
		await page.addInitScript(() => {
			document.addEventListener('securitypolicyviolation', (event) => {
				const root = document.documentElement;
				root.dataset.blocked = `${root.dataset.blocked ?? ''}${event.blockedURI} `;
			});
		});
		await page.route(path, async (route) => {
			const response = await route.fetch();
			const html = (await response.text())
				.replace(/<meta http-equiv="content-security-policy"[^>]*>/, '')
				.replace('</body>', '<script>document.title = "Injected"</script></body>');
			await route.fulfill({ response, body: html });
		});

		await page.goto(path);

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
		await expect(page.locator('html')).toHaveAttribute('data-blocked', 'inline ');
		await expect(page.locator('meta[http-equiv="content-security-policy"]')).toHaveCount(0);
		await expect(page).not.toHaveTitle('Injected');
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
