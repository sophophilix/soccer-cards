import { defineConfig, devices } from '@playwright/test';

// @types/node is not a dependency of this task, so name the globals used.
declare const process: {
	readonly env: { readonly CI?: string; readonly PREVIEW_PORT?: string };
	cwd(): string;
};

// Ports from 20000 to 29999 need no special rights and hold no well-known service.
const FIRST_PREVIEW_PORT = 20_000;
const PREVIEW_PORT_COUNT = 10_000;
const CI_PREVIEW_PORT = 8787;
const HIGHEST_PORT = 65_535;
const PREVIEW_START_TIMEOUT_MS = 120_000;
const isCi = Boolean(process.env.CI);

/** Hashes a folder path with FNV-1a, so the same folder always gets the same port. */
function portForFolder(folder: string): number {
	let hash = 0x811c9dc5;
	for (const character of folder) {
		hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 0x01000193) >>> 0;
	}
	return FIRST_PREVIEW_PORT + (hash % PREVIEW_PORT_COUNT);
}

/** Picks the preview port: PREVIEW_PORT, then the CI port, then one from the folder. */
function choosePreviewPort(): number {
	const requested = process.env.PREVIEW_PORT;
	if (requested === undefined || requested === '') {
		return isCi ? CI_PREVIEW_PORT : portForFolder(process.cwd());
	}
	const port = Number(requested);
	if (!Number.isInteger(port) || port < 1 || port > HIGHEST_PORT) {
		throw new Error(`PREVIEW_PORT must be a whole number from 1 to ${String(HIGHEST_PORT)}.`);
	}
	return port;
}

const previewPort = choosePreviewPort();
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
