import { expect, test } from 'vitest';
import { readScriptHashes, writeScriptSources } from './script-hashes.ts';

const INLINE_SCRIPT = '<script>start()</script>';

function aPage(scriptSources: string, body: string): string {
	const policy = `default-src 'self'; script-src ${scriptSources}; style-src 'self' 'sha256-style='`;
	return `<html><head><meta http-equiv="content-security-policy" content="${policy}"></head><body>${body}</body></html>`;
}

test('reads the hash of the inline script from the policy in the page', () => {
	const page = aPage("'self' 'sha256-abc+/123='", INLINE_SCRIPT);

	expect(readScriptHashes(page)).toEqual({ ok: true, hashes: ["'sha256-abc+/123='"] });
});

test('reads every script hash and leaves the style hash out', () => {
	const page = aPage("'self' 'sha256-one=' 'sha384-two='", INLINE_SCRIPT + INLINE_SCRIPT);

	expect(readScriptHashes(page)).toEqual({ ok: true, hashes: ["'sha256-one='", "'sha384-two='"] });
});

test('reads no hash from a page with no inline script', () => {
	const page = aPage("'self'", '<script src="/app.js"></script>');

	expect(readScriptHashes(page)).toEqual({ ok: true, hashes: [] });
});

test('refuses a page with an inline script and no hash in its policy', () => {
	const page = aPage("'self'", INLINE_SCRIPT);

	expect(readScriptHashes(page)).toEqual({ ok: false, reason: 'inline-script-without-hash' });
});

test('refuses a page with an inline script and no policy', () => {
	const page = `<html><body>${INLINE_SCRIPT}</body></html>`;

	expect(readScriptHashes(page)).toEqual({ ok: false, reason: 'inline-script-without-hash' });
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
