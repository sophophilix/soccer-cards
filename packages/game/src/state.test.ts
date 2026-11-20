import { describe, expect, it } from 'vitest';
import {
	JUMBO_PACK_COST_COINS,
	STANDARD_PACK_COST_COINS,
	STARTING_COINS,
	STARTING_FREE_PACKS,
	STATE_VERSION,
	addPendingPack,
	createPlayerState,
	createRandom,
	openPlayerPack,
	packCostCoins,
	toCardId
} from './index.ts';
import type { PackKind, PackToOpen, PlayerState, StateRefusal, StateResult } from './index.ts';
import { aCheckedCardSet } from './testing/cards.ts';
import { aPlayerState } from './testing/state.ts';

const SEED = 20261116;

const aPack = (kind: PackKind, overrides: Partial<PackToOpen> = {}): PackToOpen => ({
	kind,
	cardSet: aCheckedCardSet({ base: 40, rare: 10, legend: 6, icon: 1 }),
	random: createRandom(SEED),
	...overrides
});
const stateOf = (result: StateResult<StateRefusal>): PlayerState | undefined =>
	result.ok ? result.value : undefined;

describe('createPlayerState', () => {
	it('starts a player with 2 free packs, 0 coins and nothing collected', () => {
		expect(createPlayerState()).toEqual({
			version: 2,
			freePacks: 2,
			coins: 0,
			collection: {},
			favourites: [],
			pendingPack: null,
			division: 'division-4',
			divisionWins: 0,
			wins: 0,
			losses: 0
		});
	});

	it('names the starting values and the prices', () => {
		expect([STATE_VERSION, STARTING_FREE_PACKS, STARTING_COINS]).toEqual([2, 2, 0]);
		expect([STANDARD_PACK_COST_COINS, JUMBO_PACK_COST_COINS]).toEqual([5, 20]);
		expect([packCostCoins('standard'), packCostCoins('jumbo')]).toEqual([5, 20]);
	});
});

describe('openPlayerPack', () => {
	it('uses a free pack for a standard pack and keeps the coins', () => {
		const state = aPlayerState({ freePacks: 2, coins: 7 });

		const next = stateOf(openPlayerPack(state, aPack('standard')));

		expect(next).toMatchObject({ freePacks: 1, coins: 7 });
	});

	it('uses the last free pack, then asks for coins', () => {
		const state = aPlayerState({ freePacks: 1, coins: 0 });

		const afterLast = stateOf(openPlayerPack(state, aPack('standard')));
		const afterNone = openPlayerPack(aPlayerState({ freePacks: 0, coins: 0 }), aPack('standard'));

		expect(afterLast).toMatchObject({ freePacks: 0, coins: 0 });
		expect(afterNone).toEqual({ ok: false, reason: 'not-enough-coins' });
	});

	it('takes 5 coins for a standard pack when no free pack is left', () => {
		const state = aPlayerState({ freePacks: 0, coins: 8 });

		const next = stateOf(openPlayerPack(state, aPack('standard')));

		expect(next).toMatchObject({ freePacks: 0, coins: 3 });
	});

	it('leaves 0 coins when the player has exactly the price', () => {
		const state = aPlayerState({ freePacks: 0, coins: 5 });

		const next = stateOf(openPlayerPack(state, aPack('standard')));

		expect(next?.coins).toBe(0);
	});

	it('refuses a standard pack one coin short and changes nothing', () => {
		const state = aPlayerState({ freePacks: 0, coins: 4 });
		const before = JSON.stringify(state);

		const result = openPlayerPack(state, aPack('standard'));

		expect(result).toEqual({ ok: false, reason: 'not-enough-coins' });
		expect(JSON.stringify(state)).toBe(before);
	});

	it('uses a free pack for a standard pack when the player has 20 coins', () => {
		const state = aPlayerState({ freePacks: 1, coins: 20 });

		const next = stateOf(openPlayerPack(state, aPack('standard')));

		expect(next).toMatchObject({ freePacks: 0, coins: 20 });
	});

	it('takes 20 coins for a jumbo pack and never a free pack', () => {
		const state = aPlayerState({ freePacks: 2, coins: 20 });

		const next = stateOf(openPlayerPack(state, aPack('jumbo')));

		expect(next).toMatchObject({ freePacks: 2, coins: 0 });
		expect(next?.pendingPack?.cardIds).toHaveLength(50);
	});

	it('refuses a jumbo pack with 19 coins, even with free packs left', () => {
		const state = aPlayerState({ freePacks: 2, coins: 19 });

		const result = openPlayerPack(state, aPack('jumbo'));

		expect(result).toEqual({ ok: false, reason: 'not-enough-coins' });
	});

	it('refuses a jumbo pack with 19 coins and no free pack, and changes nothing', () => {
		const state = aPlayerState({ freePacks: 0, coins: 19 });
		const before = JSON.stringify(state);

		const result = openPlayerPack(state, aPack('jumbo'));

		expect(result).toEqual({ ok: false, reason: 'not-enough-coins' });
		expect(JSON.stringify(state)).toBe(before);
	});

	it('holds the opened cards as pending and leaves the collection alone', () => {
		const next = stateOf(openPlayerPack(aPlayerState(), aPack('standard')));

		expect(next?.pendingPack?.kind).toBe('standard');
		expect(next?.pendingPack?.cardIds).toHaveLength(10);
		expect(next?.collection).toEqual({});
	});

	it('refuses a second pack while one is pending', () => {
		const state = aPlayerState({
			coins: 20,
			pendingPack: { kind: 'standard', cardIds: [toCardId('base-1')] }
		});

		const result = openPlayerPack(state, aPack('jumbo'));

		expect(result).toEqual({ ok: false, reason: 'pack-pending' });
	});

	it('refuses, and takes no payment, when the card set has no Icon', () => {
		const state = aPlayerState({ freePacks: 1, coins: 5 });
		const before = JSON.stringify(state);
		const noIcon = aCheckedCardSet({ base: 40, rare: 10, legend: 6 });

		const result = openPlayerPack(state, aPack('standard', { cardSet: noIcon }));

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards' });
		expect(JSON.stringify(state)).toBe(before);
	});
});

describe('addPendingPack', () => {
	it('adds every pending card, counts doubles and clears the pending pack', () => {
		const state = aPlayerState({
			collection: { [toCardId('base-1')]: 1, [toCardId('rare-1')]: 2 },
			pendingPack: {
				kind: 'standard',
				cardIds: [toCardId('base-1'), toCardId('base-2'), toCardId('rare-1')]
			}
		});

		const next = stateOf(addPendingPack(state));

		expect(next?.collection).toEqual({ 'base-1': 2, 'base-2': 1, 'rare-1': 3 });
		expect(next?.pendingPack).toBeNull();
	});

	it('does not change the state it was given', () => {
		const state = aPlayerState({
			pendingPack: { kind: 'standard', cardIds: [toCardId('base-1')] }
		});
		const before = JSON.stringify(state);

		addPendingPack(state);

		expect(JSON.stringify(state)).toBe(before);
	});

	it('refuses when no pack is pending', () => {
		const result = addPendingPack(aPlayerState());

		expect(result).toEqual({ ok: false, reason: 'no-pending-pack' });
	});
});
