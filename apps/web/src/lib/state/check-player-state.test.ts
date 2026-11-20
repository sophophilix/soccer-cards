import { createPlayerState } from '@soccer-cards/game';
import { describe, expect, test } from 'vitest';
import { checkPlayerState } from './check-player-state.ts';
import type { Migration } from './check-player-state.ts';

const aSavedState = (overrides: Readonly<Record<string, unknown>> = {}): unknown => ({
	...createPlayerState(),
	collection: { 'card-1': 2 },
	...overrides
});

describe('checkPlayerState', () => {
	test('accepts a state of the current version and gives it back unchanged', () => {
		expect(checkPlayerState(aSavedState())).toEqual({ ok: true, value: aSavedState() });
	});

	test.each([
		['not an object', 'hello'],
		['null', null],
		['a wrong type', aSavedState({ coins: '5' })],
		['a missing field', aSavedState({ losses: undefined })],
		['a negative count', aSavedState({ freePacks: -1 })],
		['a negative card count', aSavedState({ collection: { 'card-1': -1 } })],
		['a card count that is not whole', aSavedState({ collection: { 'card-1': 1.5 } })],
		['a collection that is a list', aSavedState({ collection: [1] })],
		['an unknown division', aSavedState({ division: 'division-9' })],
		['division wins that are not whole', aSavedState({ divisionWins: 0.5 })],
		['negative wins', aSavedState({ wins: -2 })],
		['a favourite that is not a card id', aSavedState({ favourites: [7] })],
		['an empty card id', aSavedState({ collection: { ' ': 1 } })],
		['a pending pack of an unknown kind', aSavedState({ pendingPack: { kind: 'x', cardIds: [] } })],
		['a pending pack with no cards', aSavedState({ pendingPack: { kind: 'jumbo' } })],
		['an older version with no migration', aSavedState({ version: 1 })]
	])('refuses %s', (_name, saved) => {
		expect(checkPlayerState(saved)).toEqual({ ok: false, reason: 'invalid' });
	});

	test('keeps a pending pack that is whole', () => {
		const pendingPack = { kind: 'standard', cardIds: ['card-1', 'card-2'] };

		expect(checkPlayerState(aSavedState({ pendingPack }))).toMatchObject({
			ok: true,
			value: { pendingPack }
		});
	});

	test('reports a version newer than the game knows', () => {
		expect(checkPlayerState(aSavedState({ version: 3 }))).toEqual({
			ok: false,
			reason: 'newer-version'
		});
	});

	test('runs the migrations in order from an older version', () => {
		const migrations: Migration[] = [
			{ from: 1, migrate: (saved) => ({ ...saved, version: 2, coins: 7 }) },
			{ from: 0, migrate: (saved) => ({ ...saved, version: 1, wins: 4 }) }
		];

		expect(checkPlayerState(aSavedState({ version: 0 }), migrations)).toEqual({
			ok: true,
			value: aSavedState({ coins: 7, wins: 4 })
		});
	});

	test('refuses a migration that does not move up one version', () => {
		const migrations: Migration[] = [{ from: 1, migrate: (saved) => saved }];

		expect(checkPlayerState(aSavedState({ version: 1 }), migrations)).toEqual({
			ok: false,
			reason: 'invalid'
		});
	});
});
