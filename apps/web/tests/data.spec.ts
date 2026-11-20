import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const OK_STATUS = 200;
const NOT_FOUND_STATUS = 404;
// Playwright runs from apps/web. The build copies this folder to /api/v1/ (vite.config.ts).
const PUBLISHED_PLAYERS_FILE = '../../data/api/v1/players.json';
const NOT_PUBLISHED = 'T-0084 publishes data/api/v1/. Until then the site has no API files.';
const PUBLISHED = 'data/api/v1/ is published (T-0084), so the API files are served.';

/** Reads the published player list from the repository, or `undefined` before T-0084 publishes it. */
function readPublishedPlayers(): Promise<string | undefined> {
	return readFile(PUBLISHED_PLAYERS_FILE, 'utf8').catch(() => undefined);
}

/** The first photo path in a player list, relative to /api/v1/. */
function firstPhotoUri(players: string): string {
	const list = JSON.parse(players) as { players: { photo?: { uri: string } }[] };
	return list.players.find((player) => player.photo !== undefined)?.photo?.uri ?? '';
}

test('the site serves players.json and its photos from its own origin with the site headers', async ({
	request
}) => {
	const published = await readPublishedPlayers();
	test.skip(published === undefined, NOT_PUBLISHED);

	const response = await request.get('/api/v1/players.json');
	const headers = response.headers();

	expect(response.status()).toBe(OK_STATUS);
	expect(headers['content-type']).toContain('application/json');
	expect(headers['content-security-policy']).toContain("default-src 'self'");
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(await response.json()).toEqual(JSON.parse(published ?? '{}'));
	const photo = await request.get(`/api/v1/${firstPhotoUri(published ?? '')}`);
	expect(photo.status()).toBe(OK_STATUS);
	expect(photo.headers()['content-type']).toMatch(/^image\//);
	expect(photo.headers()['x-content-type-options']).toBe('nosniff');
});

test('the site builds without the API and answers not found for it', async ({ request }) => {
	test.skip((await readPublishedPlayers()) !== undefined, PUBLISHED);

	const response = await request.get('/api/v1/players.json');

	expect(response.status()).toBe(NOT_FOUND_STATUS);
	expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
});
