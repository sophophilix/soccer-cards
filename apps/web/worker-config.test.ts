import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

const CONFIG_URL = new URL('./wrangler.jsonc', import.meta.url);

// A string is kept whole, so a "//" inside one is not taken for a comment.
const STRING_OR_COMMENT = /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
// A second pass, so a comment after a trailing comma doesn't hide the comma.
const STRING_OR_TRAILING_COMMA = /("(?:\\.|[^"\\])*")|,(?=\s*[}\]])/g;
const keepString = (_match: string, quoted: string | undefined): string => quoted ?? '';

/** Turns JSON with comments and trailing commas into plain JSON. */
function stripComments(text: string): string {
	return text.replace(STRING_OR_COMMENT, keepString).replace(STRING_OR_TRAILING_COMMA, keepString);
}

/** Reads a nested value, or undefined when any key on the way is missing. */
function valueAt(source: unknown, keys: readonly string[]): unknown {
	return keys.reduce<unknown>(
		(value, key) =>
			typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined,
		source
	);
}

async function readWorkerConfig(): Promise<unknown> {
	const text = await readFile(decodeURIComponent(CONFIG_URL.pathname), 'utf8');
	return JSON.parse(stripComments(text));
}

test('a "//" inside a string is not stripped as a comment', () => {
	expect(JSON.parse(stripComments('{ "a": "https://x", // note\n}'))).toEqual({ a: 'https://x' });
});

// A missing key means the platform default, and observability is on by default.
for (const keys of [
	['observability', 'enabled'],
	['observability', 'logs', 'enabled'],
	['observability', 'traces', 'enabled']
]) {
	test(`the Worker sets ${keys.join('.')} to false`, async () => {
		expect(valueAt(await readWorkerConfig(), keys)).toBe(false);
	});
}

// OpenTofu owns the address (ADR 0002 D8). A custom domain is a kind of route.
// Logpush and tail consumers would send request data off the Worker.
for (const key of ['route', 'routes', 'logpush', 'tail_consumers', 'streaming_tail_consumers']) {
	test(`the Worker declares no ${key}`, async () => {
		expect(valueAt(await readWorkerConfig(), [key])).toBeUndefined();
	});
}

test('the Worker declares no environment that could override these settings', async () => {
	expect(valueAt(await readWorkerConfig(), ['env'])).toBeUndefined();
});

test('the Worker declares no previews block that could override these settings', async () => {
	expect(valueAt(await readWorkerConfig(), ['previews'])).toBeUndefined();
});

test('the Worker keeps preview URLs on for the end-to-end tests', async () => {
	expect(valueAt(await readWorkerConfig(), ['preview_urls'])).toBe(true);
});
