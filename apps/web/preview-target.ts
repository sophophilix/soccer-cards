import { choosePreviewPort } from './preview-port.ts';

const PREVIEW_START_TIMEOUT_MS = 120_000;

interface PreviewTargetInput {
	readonly env: {
		readonly CI?: string;
		readonly PREVIEW_PORT?: string;
		readonly PREVIEW_URL?: string;
	};
	readonly folder: string;
}

interface PreviewTarget {
	readonly baseURL: string;
	readonly webServer?: {
		command: string;
		url: string;
		reuseExistingServer: false;
		timeout: number;
	};
}

/** Picks PREVIEW_URL, such as a pull request's preview (ADR 0002 D4), or else a local server. */
export function choosePreviewTarget({ env, folder }: PreviewTargetInput): PreviewTarget {
	const requested = env.PREVIEW_URL;
	if (requested !== undefined && requested !== '') {
		const address = URL.canParse(requested) ? new URL(requested) : undefined;
		const isLocal = address?.protocol === 'http:' && address.hostname === 'localhost';
		if (address?.protocol !== 'https:' && !isLocal) {
			throw new Error('PREVIEW_URL must be an https:// address, or http://localhost.');
		}
		return { baseURL: address.origin };
	}
	const port = String(choosePreviewPort({ env, folder }));
	const baseURL = `http://localhost:${port}`;
	// The built site, served as production serves it (ADR 0001 D8). A server this
	// run didn't start may be another worktree's build, so a taken port fails the
	// run, and Playwright's error names the port.
	const command = `pnpm run build && pnpm run preview --port ${port}`;
	return {
		baseURL,
		webServer: {
			command,
			url: baseURL,
			reuseExistingServer: false,
			timeout: PREVIEW_START_TIMEOUT_MS
		}
	};
}
