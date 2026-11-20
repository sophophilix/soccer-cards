import { toCardId } from '@soccer-cards/game';
import { describe, expect, it } from 'vitest';
import goalkeeper from '../../../../../packages/schema/schemas/v1/examples/player.goalkeeper.json';
import outfield from '../../../../../packages/schema/schemas/v1/examples/player.outfield.json';
import { PLAYERS_PATH, loadCardSet } from './load-card-set.ts';
import type { FetchFile } from './load-card-set.ts';

const NOT_FOUND_STATUS = 404;

/** A stand-in for `fetch` that answers every request with this body and status, and records the paths. */
function aFetch(body: string, status = 200): { fetchFile: FetchFile; paths: string[] } {
	const paths: string[] = [];
	const fetchFile = (path: string): Promise<Response> => {
		paths.push(path);
		return Promise.resolve(new Response(body, { status }));
	};
	return { fetchFile, paths };
}

/** A stand-in for `fetch` that answers with this player list. */
function aPlayerList(players: readonly unknown[]): FetchFile {
	return aFetch(JSON.stringify({ players })).fetchFile;
}

describe('loadCardSet', () => {
	it('asks the site itself for players.json', async () => {
		const { fetchFile, paths } = aFetch(JSON.stringify({ players: [outfield] }));

		await loadCardSet(fetchFile);

		expect(paths).toEqual([PLAYERS_PATH]);
		expect(PLAYERS_PATH).toBe('/api/v1/players.json');
	});

	it('turns the schema examples into a checked card set', async () => {
		const result = await loadCardSet(aPlayerList([outfield, goalkeeper]));

		expect(result.ok && result.value.map((card) => card.id)).toEqual([
			toCardId('tavi-brightwell'),
			toCardId('juno-marshwick')
		]);
		expect(result.ok && result.leftOutCount).toBe(0);
	});

	it('leaves out a card with an unknown tier and keeps the rest', async () => {
		const result = await loadCardSet(aPlayerList([outfield, { ...goalkeeper, tier: 'MYTHIC' }]));

		expect(result.ok && result.value.map((card) => card.id)).toEqual([toCardId('tavi-brightwell')]);
		expect(result.ok && result.leftOutCount).toBe(1);
	});

	it('refuses an empty list', async () => {
		expect(await loadCardSet(aPlayerList([]))).toEqual({ ok: false, reason: 'empty-card-set' });
	});

	it('refuses a list whose every card is unknown', async () => {
		const result = await loadCardSet(aPlayerList([{ ...outfield, position: 'WINGER' }]));

		expect(result).toEqual({ ok: false, reason: 'empty-card-set' });
	});

	it('refuses a list that holds the same player twice', async () => {
		const result = await loadCardSet(aPlayerList([outfield, outfield]));

		expect(result).toEqual({
			ok: false,
			reason: 'repeated-card-id',
			cardId: toCardId('tavi-brightwell')
		});
	});

	it('reports a network failure', async () => {
		const failingFetch = (): Promise<Response> => Promise.reject(new TypeError('offline'));

		expect(await loadCardSet(failingFetch)).toEqual({ ok: false, reason: 'network-error' });
	});

	it.each([
		{ body: 'Not found', status: NOT_FOUND_STATUS },
		{ body: '<!doctype html>', status: 200 }
	])('reports the response $status $body as bad', async ({ body, status }) => {
		expect(await loadCardSet(aFetch(body, status).fetchFile)).toEqual({
			ok: false,
			reason: 'bad-response'
		});
	});

	it.each([[], null, {}, { players: {} }, { players: 'all' }])(
		'reports the body %j as not a player list',
		async (body) => {
			const { fetchFile } = aFetch(JSON.stringify(body));

			expect(await loadCardSet(fetchFile)).toEqual({ ok: false, reason: 'not-a-player-list' });
		}
	);
});
