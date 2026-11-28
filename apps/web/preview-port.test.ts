import { expect, test } from 'vitest';
import { FIRST_PREVIEW_PORT, LAST_PREVIEW_PORT, choosePreviewPort } from './preview-port.ts';

const aFolder = '/home/coach/soccer-cards/.claude/worktrees/agent-one/apps/web';
const anotherFolder = '/home/coach/soccer-cards/.claude/worktrees/agent-two/apps/web';

test('the same folder always gives the same port', () => {
	expect(choosePreviewPort({ env: {}, folder: aFolder })).toBe(
		choosePreviewPort({ env: {}, folder: aFolder })
	);
});

test('two folders give different ports', () => {
	expect(choosePreviewPort({ env: {}, folder: aFolder })).not.toBe(
		choosePreviewPort({ env: {}, folder: anotherFolder })
	);
});

test('every derived port is in the preview range', () => {
	const folders = Array.from({ length: 500 }, (_, index) => `/checkouts/copy-${String(index)}`);
	const ports = folders.map((folder) => choosePreviewPort({ env: {}, folder }));
	expect(ports.filter((port) => port < FIRST_PREVIEW_PORT || port > LAST_PREVIEW_PORT)).toEqual([]);
});

test('PREVIEW_PORT overrides the port from the folder', () => {
	expect(choosePreviewPort({ env: { PREVIEW_PORT: '31234' }, folder: aFolder })).toBe(31_234);
});

test('CI keeps the one fixed port', () => {
	expect(choosePreviewPort({ env: { CI: 'true' }, folder: aFolder })).toBe(8787);
});

for (const bad of ['abc', '0', '65536', '8787.5', '-1']) {
	test(`a PREVIEW_PORT of "${bad}" is refused`, () => {
		expect(() => choosePreviewPort({ env: { PREVIEW_PORT: bad }, folder: aFolder })).toThrow(
			/PREVIEW_PORT/
		);
	});
}
