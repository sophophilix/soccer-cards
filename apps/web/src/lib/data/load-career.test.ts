import { describe, expect, it, vi } from 'vitest';
import { clubNamesFromList } from './card-face-from-summary.ts';
import { loadCareer } from './load-career.ts';

const clubNames: ReadonlyMap<string, string> = new Map([
	['aaa', 'Alpha FC'],
	['bbb', 'Beta United']
]);

function aResponse(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), init);
}

async function loadFrom(body: unknown) {
	return loadCareer(() => Promise.resolve(aResponse(body)), 'p-1', clubNames);
}

function recordWith(careerSpells: unknown): unknown {
	return { id: 'p-1', careerSpells };
}

describe('loadCareer', () => {
	it('returns the spells in the published order with club names', async () => {
		const record = {
			...(recordWith([
				{ club: 'clubs/bbb', startYear: 2010, endYear: 2014, goalCount: { value: 3 } },
				{ club: 'clubs/aaa', startYear: 2014 }
			]) as object),
			extra: true
		};

		expect(await loadFrom(record)).toEqual({
			playerId: 'p-1',
			spells: [
				{ clubId: 'bbb', displayName: 'Beta United', startYear: 2010, endYear: 2014 },
				{ clubId: 'aaa', displayName: 'Alpha FC', startYear: 2014 }
			]
		});
	});

	it('asks only for the player record on the site origin', async () => {
		const fetchFile = vi.fn(() => Promise.resolve(aResponse({})));

		await loadCareer(fetchFile, 'p-1', clubNames);

		expect(fetchFile).toHaveBeenCalledExactlyOnceWith('/api/v1/players/p-1.json');
	});

	it('encodes an id that needs it', async () => {
		const fetchFile = vi.fn(() => Promise.resolve(aResponse({})));

		await loadCareer(fetchFile, '../a/b%', clubNames);

		expect(fetchFile).toHaveBeenCalledWith('/api/v1/players/..%2Fa%2Fb%25.json');
	});

	it('gives no career when the request fails', async () => {
		const offline = () => Promise.reject(new Error('offline'));

		expect(await loadCareer(offline, 'p-1', clubNames)).toBeUndefined();
	});

	it('gives no career for a missing record', async () => {
		const missing = () =>
			Promise.resolve(
				aResponse(recordWith([{ club: 'clubs/aaa', startYear: 2010 }]), { status: 404 })
			);

		expect(await loadCareer(missing, 'p-1', clubNames)).toBeUndefined();
	});

	it('gives no career for a body that is not JSON or not a record', async () => {
		const notJson = () => Promise.resolve(new Response('<html>'));

		expect(await loadCareer(notJson, 'p-1', clubNames)).toBeUndefined();
		expect(await loadFrom('players')).toBeUndefined();
		expect(await loadFrom(null)).toBeUndefined();
	});

	it('gives no career without spells', async () => {
		expect(await loadFrom({})).toBeUndefined();
		expect(await loadFrom(recordWith([]))).toBeUndefined();
		expect(await loadFrom(recordWith('x'))).toBeUndefined();
	});

	it('gives no career when one spell is malformed', async () => {
		const good = { club: 'clubs/aaa', startYear: 2010 };

		expect(await loadFrom(recordWith([good, null]))).toBeUndefined();
		expect(await loadFrom(recordWith([good, { club: 'clubs/aaa' }]))).toBeUndefined();
		expect(await loadFrom(recordWith([good, { club: 7, startYear: 2012 }]))).toBeUndefined();
		expect(await loadFrom(recordWith([good, { club: 'aaa', startYear: 2012 }]))).toBeUndefined();
	});

	it('gives no career when a spell names an unknown club', async () => {
		const spells = [
			{ club: 'clubs/aaa', startYear: 2010 },
			{ club: 'clubs/zzz', startYear: 2012 }
		];

		expect(await loadFrom(recordWith(spells))).toBeUndefined();
	});

	it('gives no career when a club has no slug or more than one part', async () => {
		const good = { club: 'clubs/aaa', startYear: 2010 };

		expect(await loadFrom(recordWith([good, { club: 'clubs/', startYear: 2012 }]))).toBeUndefined();
		expect(
			await loadFrom(recordWith([good, { club: 'clubs/aaa/bbb', startYear: 2012 }]))
		).toBeUndefined();
	});

	it('finds the clubs in the map the club list gives', async () => {
		const list = {
			clubs: [
				{ name: 'clubs/aaa', displayName: 'Alpha FC' },
				{ name: 'clubs/bbb', displayName: 'Beta United' }
			]
		};
		const spells = [{ club: 'clubs/bbb', startYear: 2010 }];
		const career = await loadCareer(
			() => Promise.resolve(aResponse(recordWith(spells))),
			'p-1',
			clubNamesFromList(list)
		);

		expect(career?.spells[0]?.displayName).toBe('Beta United');
	});

	it('gives no career when the end year is before the start year', async () => {
		const spells = [{ club: 'clubs/aaa', startYear: 2012, endYear: 2011 }];

		expect(await loadFrom(recordWith(spells))).toBeUndefined();
	});

	it('keeps a spell that starts and ends in one year', async () => {
		const spells = [{ club: 'clubs/aaa', startYear: 2012, endYear: 2012 }];

		expect((await loadFrom(recordWith(spells)))?.spells).toHaveLength(1);
	});

	it('gives no career when a year is not a whole number', async () => {
		const fractional = [{ club: 'clubs/aaa', startYear: 2010.5 }];
		const text = [{ club: 'clubs/aaa', startYear: 2010, endYear: '2012' }];

		expect(await loadFrom(recordWith(fractional))).toBeUndefined();
		expect(await loadFrom(recordWith(text))).toBeUndefined();
	});
});
