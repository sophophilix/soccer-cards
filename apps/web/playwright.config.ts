import { defineConfig, devices } from '@playwright/test';
import { choosePreviewTarget } from './preview-target.ts';

// @types/node is not a dependency of this task, so name the globals used.
declare const process: {
	readonly env: {
		readonly CI?: string;
		readonly PREVIEW_PORT?: string;
		readonly PREVIEW_URL?: string;
	};
	cwd(): string;
};

const isCi = Boolean(process.env.CI);

// The local built site (ADR 0001 D8), or the Cloudflare preview in PREVIEW_URL.
const { baseURL, ...localServer } = choosePreviewTarget({
	env: process.env,
	folder: process.cwd()
});

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: isCi,
	retries: isCi ? 1 : 0,
	reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{ name: 'phone-chromium', use: { ...devices['Pixel 7'] } },
		{ name: 'phone-webkit', use: { ...devices['iPhone 15'] } },
		{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }
	],
	...localServer
});
