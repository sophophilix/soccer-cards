import adapter from '@sveltejs/adapter-static';
import type { Adapter } from '@sveltejs/kit';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'vitest/config';
import { readScriptHashes, writeScriptSources } from './src/lib/response-headers/script-hashes.ts';

const BUILD_FOLDER = 'build';
const HEADERS_FILE = `${BUILD_FOLDER}/_headers`;
// The static API (ADR 0005), served at /api/v1/ from the site's own origin (ADR 0003 D5).
// The build copies nothing when the folder is missing, so the site builds before T-0084.
const API_SOURCE_FOLDER = '../../data/api/v1';
const API_BUILD_FOLDER = `${BUILD_FOLDER}/api/v1`;
const LIB_COVERAGE_PERCENT = 80;
// The style attribute on SvelteKit's route announcer. static/_headers has the same hash.
const ANNOUNCER_STYLE_HASH = 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=';

/** Adds the script hashes of every built page to `script-src` in the built `_headers` file. */
async function writeScriptHashesToHeaders(): Promise<void> {
	const files = await readdir(BUILD_FOLDER, { recursive: true });
	const hashes: string[] = [];
	for (const file of files.filter((name) => name.endsWith('.html'))) {
		const found = await readScriptHashes(await readFile(`${BUILD_FOLDER}/${file}`, 'utf8'));
		if (!found.ok) {
			throw new Error(`${file} has an inline script and no hash for it in its policy.`);
		}
		hashes.push(...found.hashes);
	}
	const headers = writeScriptSources(await readFile(HEADERS_FILE, 'utf8'), hashes);
	if (headers === undefined) {
		throw new Error(`${HEADERS_FILE} has no script-src to add the script hashes to.`);
	}
	await writeFile(HEADERS_FILE, headers);
}

/** Wraps an adapter so every build finishes the response header and then adds the API files. */
function withApiAndScriptHashes(inner: Adapter): Adapter {
	return {
		...inner,
		adapt: async (builder) => {
			await inner.adapt(builder);
			await writeScriptHashesToHeaders();
			// After the hashes are read, so no file in the API can widen script-src.
			builder.copy(API_SOURCE_FOLDER, API_BUILD_FOLDER);
		}
	};
}

export default defineConfig({
	plugins: [
		sveltekit({
			// 404.html is the page wrangler serves for a path that doesn't exist.
			adapter: withApiAndScriptHashes(adapter({ pages: BUILD_FOLDER, fallback: '404.html' })),
			// Each page's <meta> tag gets a hash for each inline script. The build
			// copies those hashes into the response header, which holds the rest
			// (ADR 0002 D5, ADR 0003 D6).
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-hashes', ANNOUNCER_STYLE_HASH],
					'object-src': ['none']
				}
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		browser: {
			provider: playwright(),
			enabled: true,
			headless: true,
			instances: [{ browser: 'chromium' }]
		},
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.{ts,svelte}'],
			exclude: ['src/**/*.test.ts'],
			thresholds: { lines: LIB_COVERAGE_PERCENT, branches: LIB_COVERAGE_PERCENT }
		}
	}
});
