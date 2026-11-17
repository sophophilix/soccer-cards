const PAGE_POLICY = /<meta http-equiv="content-security-policy" content="([^"]*)"/i;
const SCRIPT_SOURCES = /script-src [^;]*/;
// Only the header's own line, so a comment that names script-src stays as it is.
const HEADER_SCRIPT_SOURCES = /^([ \t]*Content-Security-Policy:[^\n]*?\bscript-src)\b[^;\n]*/m;
const HASH_SOURCE = /'sha(?:256|384|512)-[A-Za-z0-9+/=_-]+'/g;
// Captures the attributes and the text of each script with no src attribute.
const INLINE_SCRIPT = /<script\b(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const SCRIPT_TYPE = /\stype=["']?([^"'\s>]*)/i;
// A type outside this list is data to a browser. An unknown type that names a
// script still needs a hash, so a mistake here blocks a script and never allows one.
const TYPE_A_BROWSER_RUNS = /^(?:|module|importmap|speculationrules)$|script/i;

export type ScriptHashes =
	| { readonly ok: true; readonly hashes: readonly string[] }
	| { readonly ok: false; readonly reason: 'inline-script-without-hash' };

async function hashSourceOf(script: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script));
	return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`;
}

/** Reads the script hashes in a built page's policy, and refuses the page when an inline script has none. */
export async function readScriptHashes(html: string): Promise<ScriptHashes> {
	const policy = PAGE_POLICY.exec(html)?.[1] ?? '';
	const hashes: readonly string[] = SCRIPT_SOURCES.exec(policy)?.[0].match(HASH_SOURCE) ?? [];
	const scripts = [...html.matchAll(INLINE_SCRIPT)]
		.filter(([, attributes = '']) =>
			TYPE_A_BROWSER_RUNS.test(SCRIPT_TYPE.exec(attributes)?.[1] ?? '')
		)
		.map(([, , script = '']) => script);
	const needed = await Promise.all(scripts.map(hashSourceOf));
	if (needed.some((hash) => !hashes.includes(hash))) {
		return { ok: false, reason: 'inline-script-without-hash' };
	}
	return { ok: true, hashes };
}

/** Sets `script-src` in a `_headers` file to 'self' and the hashes, or returns nothing when there is no `script-src`. */
export function writeScriptSources(headers: string, hashes: readonly string[]): string | undefined {
	if (!HEADER_SCRIPT_SOURCES.test(headers)) {
		return undefined;
	}
	const sources = ["'self'", ...[...new Set(hashes)].sort()];
	return headers.replace(
		HEADER_SCRIPT_SOURCES,
		(_, start: string) => `${start} ${sources.join(' ')}`
	);
}
