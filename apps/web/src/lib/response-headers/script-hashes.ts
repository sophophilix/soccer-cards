const PAGE_POLICY = /<meta http-equiv="content-security-policy" content="([^"]*)"/i;
const SCRIPT_SOURCES = /script-src [^;]*/;
// Only the header's own line, so a comment that names script-src stays as it is.
const HEADER_SCRIPT_SOURCES = /^([ \t]*Content-Security-Policy:[^\n]*?\bscript-src)\b[^;\n]*/m;
const HASH_SOURCE = /'sha(?:256|384|512)-[A-Za-z0-9+/=_-]+'/g;
const INLINE_SCRIPT = /<script\b(?![^>]*\ssrc=)/i;

export type ScriptHashes =
	| { readonly ok: true; readonly hashes: readonly string[] }
	| { readonly ok: false; readonly reason: 'inline-script-without-hash' };

/** Reads the script hashes that SvelteKit wrote into a built page's policy. */
export function readScriptHashes(html: string): ScriptHashes {
	const policy = PAGE_POLICY.exec(html)?.[1] ?? '';
	const hashes = SCRIPT_SOURCES.exec(policy)?.[0].match(HASH_SOURCE) ?? [];
	if (hashes.length === 0 && INLINE_SCRIPT.test(html)) {
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
