import { expect, test } from 'vitest';
import { readScriptHashes, writeScriptSources } from './script-hashes.ts';

const INLINE_SCRIPT = '<script>start()</script>';
const SECOND_INLINE_SCRIPT = '<script>stop()</script>';
// The SHA-256 hashes of `start()` and `stop()`.
const START_HASH = "'sha256-DIm7WJS6ZKDYe5qFLPy+h4JFI9Bol5QmYC57mt3Fb00='";
const STOP_HASH = "'sha256-+cxkFLprM1p+UYdsltwfzLJhu4c0AWgWWM2wCE77y2Q='";
const REFUSED = { ok: false, reason: 'inline-script-without-hash' };

function aPage(scriptSources: string, body: string): string {
	const policy = `default-src 'self'; script-src ${scriptSources}; style-src 'self' 'sha256-style='`;
	return `<html><head><meta http-equiv="content-security-policy" content="${policy}"></head><body>${body}</body></html>`;
}

test('reads the hash of the inline script from the policy in the page', async () => {
	const page = aPage(`'self' ${START_HASH}`, INLINE_SCRIPT);

	expect(await readScriptHashes(page)).toEqual({ ok: true, hashes: [START_HASH] });
});

test('reads every script hash and leaves the style hash out', async () => {
	const page = aPage(`'self' ${START_HASH} 'sha384-two='`, INLINE_SCRIPT + INLINE_SCRIPT);

	expect(await readScriptHashes(page)).toEqual({ ok: true, hashes: [START_HASH, "'sha384-two='"] });
});

test('accepts two inline scripts that both have a hash', async () => {
	const page = aPage(`'self' ${START_HASH} ${STOP_HASH}`, INLINE_SCRIPT + SECOND_INLINE_SCRIPT);

	expect(await readScriptHashes(page)).toEqual({ ok: true, hashes: [START_HASH, STOP_HASH] });
});

test('refuses two inline scripts when only one has a hash', async () => {
	const page = aPage(`'self' ${START_HASH}`, INLINE_SCRIPT + SECOND_INLINE_SCRIPT);

	expect(await readScriptHashes(page)).toEqual(REFUSED);
});

test('reads no hash from a page with no inline script', async () => {
	const page = aPage("'self'", '<script src="/app.js"></script>');

	expect(await readScriptHashes(page)).toEqual({ ok: true, hashes: [] });
});

test('needs no hash for an inline script of a type that browsers do not run', async () => {
	const page = aPage("'self'", '<script type="application/json">{"coins":5}</script>');

	expect(await readScriptHashes(page)).toEqual({ ok: true, hashes: [] });
});

test.each(['module', 'text/javascript', 'importmap', 'speculationrules'])(
	'refuses an inline script of type %s that has no hash',
	async (type) => {
		const page = aPage(`'self' ${STOP_HASH}`, `<script type="${type}">start()</script>`);

		expect(await readScriptHashes(page)).toEqual(REFUSED);
	}
);

test('refuses an unhashed inline script whose end tag has a space', async () => {
	const page = aPage(`'self' ${STOP_HASH}`, '<script>start()</script >');

	expect(await readScriptHashes(page)).toEqual(REFUSED);
});

test('refuses a page with an inline script and no hash in its policy', async () => {
	const page = aPage("'self'", INLINE_SCRIPT);

	expect(await readScriptHashes(page)).toEqual(REFUSED);
});

test('refuses a page with an inline script and no policy', async () => {
	const page = `<html><body>${INLINE_SCRIPT}</body></html>`;

	expect(await readScriptHashes(page)).toEqual(REFUSED);
});

test('writes each hash once, in order, and changes no other header', () => {
	const headers = `/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'\n  X-Content-Type-Options: nosniff\n`;

	expect(writeScriptSources(headers, ["'sha256-b='", "'sha256-a='", "'sha256-b='"])).toBe(
		`/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-a=' 'sha256-b='; style-src 'self'\n  X-Content-Type-Options: nosniff\n`
	);
});

test("writes script-src 'self' when no page has an inline script", () => {
	const headers =
		"/*\n  Content-Security-Policy: script-src 'self' 'unsafe-inline'; object-src 'none'\n";

	expect(writeScriptSources(headers, [])).toBe(
		"/*\n  Content-Security-Policy: script-src 'self'; object-src 'none'\n"
	);
});

test('leaves a comment that names script-src as it is', () => {
	const headers =
		"# The build fills script-src in.\n/*\n  Content-Security-Policy: script-src 'self'\n";

	expect(writeScriptSources(headers, ["'sha256-a='"])).toBe(
		"# The build fills script-src in.\n/*\n  Content-Security-Policy: script-src 'self' 'sha256-a='\n"
	);
});

test('writes nothing when the headers have no script-src to replace', () => {
	const headers = "/*\n  Content-Security-Policy: default-src 'self'\n";

	expect(writeScriptSources(headers, [])).toBeUndefined();
});
