import { describe, expect, it, vi } from 'vitest';
import { goalCountsFrom, loadGoalCounts } from './load-goal-counts.ts';

function aResponse(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), init);
}

describe('loadGoalCounts', () => {
	it('returns both counts from a good record', async () => {
		const record = { clubGoalCount: { value: 25 }, nationalTeamGoalCount: { value: 8 } };
		const fetchFile = vi.fn(() => Promise.resolve(aResponse(record)));

		expect(await loadGoalCounts(fetchFile, 'p-1')).toEqual({
			clubGoalCount: 25,
			nationalTeamGoalCount: 8
		});
		expect(fetchFile).toHaveBeenCalledWith('/api/v1/players/p-1.json');
	});

	it('encodes an id that needs it', async () => {
		const fetchFile = vi.fn(() => Promise.resolve(aResponse({})));

		await loadGoalCounts(fetchFile, 'a/b c');

		expect(fetchFile).toHaveBeenCalledWith('/api/v1/players/a%2Fb%20c.json');
	});

	it('returns nothing for a body that fails the check', async () => {
		const body = { clubGoalCount: { value: -1 }, nationalTeamGoalCount: { value: 2.5 } };

		expect(await loadGoalCounts(() => Promise.resolve(aResponse(body)), 'p-1')).toEqual({});
		expect(await loadGoalCounts(() => Promise.resolve(aResponse('players')), 'p-1')).toEqual({});
	});

	it('returns nothing for a body that is not JSON', async () => {
		const notJson = () => Promise.resolve(new Response('<html>'));

		expect(await loadGoalCounts(notJson, 'p-1')).toEqual({});
	});

	it('returns nothing for a missing record', async () => {
		const missing = () => Promise.resolve(aResponse({}, { status: 404 }));

		expect(await loadGoalCounts(missing, 'p-1')).toEqual({});
	});

	it('returns nothing when the request fails', async () => {
		expect(await loadGoalCounts(() => Promise.reject(new Error('offline')), 'p-1')).toEqual({});
	});
});

describe('goalCountsFrom', () => {
	it('keeps a zero count and leaves out the missing one', () => {
		expect(goalCountsFrom({ nationalTeamGoalCount: { value: 0 } })).toEqual({
			nationalTeamGoalCount: 0
		});
	});

	it('reads nothing from null', () => {
		expect(goalCountsFrom(null)).toEqual({});
	});
});
