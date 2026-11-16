import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const LIB_COVERAGE_PERCENT = 80;
// The style attribute on SvelteKit's route announcer. static/_headers has the same hash.
const ANNOUNCER_STYLE_HASH = 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=';

export default defineConfig({
	plugins: [
		sveltekit({
			// 404.html is the page wrangler serves for a path that doesn't exist.
			adapter: adapter({ fallback: '404.html' }),
			// The policy goes in a <meta> tag with a hash for each inline script.
			// static/_headers holds the rest (ADR 0002 D5, ADR 0003 D6).
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
