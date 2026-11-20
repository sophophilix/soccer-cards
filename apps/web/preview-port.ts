// Ports from 20000 to 29999 need no special rights and hold no well-known service.
export const FIRST_PREVIEW_PORT = 20_000;
export const LAST_PREVIEW_PORT = 29_999;
const CI_PREVIEW_PORT = 8787;
const HIGHEST_PORT = 65_535;

interface PreviewPortInput {
	readonly env: { readonly CI?: string; readonly PREVIEW_PORT?: string };
	readonly folder: string;
}

/** Hashes a folder path with FNV-1a, so the same folder always gets the same port. */
function portForFolder(folder: string): number {
	let hash = 0x811c9dc5;
	for (const character of folder) {
		hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 0x01000193) >>> 0;
	}
	return FIRST_PREVIEW_PORT + (hash % (LAST_PREVIEW_PORT - FIRST_PREVIEW_PORT + 1));
}

/** Picks the preview port: PREVIEW_PORT, then the CI port, then one from the folder. */
export function choosePreviewPort({ env, folder }: PreviewPortInput): number {
	const requested = env.PREVIEW_PORT;
	if (requested === undefined || requested === '') {
		return env.CI ? CI_PREVIEW_PORT : portForFolder(folder);
	}
	const port = Number(requested);
	if (!Number.isInteger(port) || port < 1 || port > HIGHEST_PORT) {
		throw new Error(`PREVIEW_PORT must be a whole number from 1 to ${String(HIGHEST_PORT)}.`);
	}
	return port;
}
