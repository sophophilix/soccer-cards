import { expect, test } from 'vitest';
import { choosePreviewPort } from './preview-port.ts';
import { choosePreviewTarget } from './preview-target.ts';

const aFolder = '/home/coach/soccer-cards/.claude/worktrees/agent-one/apps/web';
const aPreview = 'https://0a1b2c3d-soccer-cards.example-coach.workers.dev';

test('with PREVIEW_URL set, the tests use its origin and start no server', () => {
	const target = choosePreviewTarget({
		env: { CI: 'true', PREVIEW_URL: `${aPreview}/some/page?x=1` },
		folder: aFolder
	});
	expect(target).toEqual({ baseURL: aPreview });
});

test('http://localhost is allowed as PREVIEW_URL', () => {
	const target = choosePreviewTarget({
		env: { PREVIEW_URL: 'http://localhost:24123/' },
		folder: aFolder
	});
	expect(target).toEqual({ baseURL: 'http://localhost:24123' });
});

test('without PREVIEW_URL, the local server uses the port from the folder', () => {
	const port = choosePreviewPort({ env: {}, folder: aFolder });
	const target = choosePreviewTarget({ env: {}, folder: aFolder });
	expect(target.baseURL).toBe(`http://localhost:${String(port)}`);
	expect(target.webServer).toEqual({
		command: `pnpm run build && pnpm run preview --port ${String(port)}`,
		url: `http://localhost:${String(port)}`,
		reuseExistingServer: false,
		timeout: 120_000
	});
});

test('an empty PREVIEW_URL counts as unset', () => {
	const target = choosePreviewTarget({ env: { CI: 'true', PREVIEW_URL: '' }, folder: aFolder });
	expect(target.baseURL).toBe('http://localhost:8787');
	expect(target.webServer?.url).toBe('http://localhost:8787');
});

for (const bad of [
	'http://0a1b2c3d-soccer-cards.example-coach.workers.dev',
	'http://localhost.example.com',
	'ftp://localhost',
	'javascript:alert(1)',
	'not an address'
]) {
	test(`a PREVIEW_URL of "${bad}" is refused`, () => {
		expect(() => choosePreviewTarget({ env: { PREVIEW_URL: bad }, folder: aFolder })).toThrow(
			/PREVIEW_URL must be an https:\/\/ address, or http:\/\/localhost/
		);
	});
}
