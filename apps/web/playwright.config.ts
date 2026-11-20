import { defineConfig, devices } from '@playwright/test';
import { choosePreviewPort } from './preview-port.ts';

// @types/node is not a dependency of this task, so name the globals used.
declare const process: {
	readonly env: { readonly CI?: string; readonly PREVIEW_PORT?: string };
	cwd(): string;
};

const PREVIEW_START_TIMEOUT_MS = 120_000;
const isCi = Boolean(process.env.CI);

const previewPort = choosePreviewPort({ env: process.env, folder: process.cwd() });
const PREVIEW_URL = `http://localhost:${String(previewPort)}`;

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
	// A server this run didn't start may be another worktree's build, so a
	// taken port fails the run, and Playwright's error names the port.
	webServer: {
		command: `pnpm run build && pnpm run preview --port ${String(previewPort)}`,
		url: PREVIEW_URL,
		reuseExistingServer: false,
		timeout: PREVIEW_START_TIMEOUT_MS
	}
});
