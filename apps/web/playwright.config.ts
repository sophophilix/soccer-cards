import { defineConfig, devices } from '@playwright/test';

// @types/node is not a dependency of this task, so name the one global used.
declare const process: { readonly env: { readonly CI?: string } };

const PREVIEW_URL = 'http://localhost:8787';
const PREVIEW_START_TIMEOUT_MS = 120_000;
const isCi = Boolean(process.env.CI);

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: isCi,
	retries: isCi ? 1 : 0,
	reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: PREVIEW_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{ name: 'phone-chromium', use: { ...devices['Pixel 7'] } },
		{ name: 'phone-webkit', use: { ...devices['iPhone 15'] } },
		{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }
	],
	// Tests run on the built site, served as production serves it (ADR 0001 D8).
	webServer: {
		command: 'pnpm run build && pnpm run preview',
		url: PREVIEW_URL,
		reuseExistingServer: !isCi,
		timeout: PREVIEW_START_TIMEOUT_MS
	}
});
