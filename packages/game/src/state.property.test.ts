import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addPendingPack, createRandom, openPlayerPack } from './index.ts';
import type { PackKind, PlayerState } from './index.ts';
import { aCardSet } from './testing/cards.ts';
import { aPlayerState } from './testing/state.ts';

const CARD_SET = aCardSet({ base: 20, rare: 5, legend: 3 });
const CARD_IDS = CARD_SET.map((card) => card.id);

type Action = { readonly do: 'open'; readonly kind: PackKind } | { readonly do: 'add' };

const seed = fc.integer();
const kind = fc.constantFrom<PackKind>('standard', 'jumbo');
const action = fc.oneof(
	fc.record({ do: fc.constant('open' as const), kind }),
	fc.constant<Action>({ do: 'add' })
);
const pendingPack = fc.option(
	fc.record({ kind, cardIds: fc.array(fc.constantFrom(...CARD_IDS), { maxLength: 20 }) })
);
const collection = fc
	.array(fc.tuple(fc.constantFrom(...CARD_IDS), fc.integer({ min: 1, max: 9 })))
	.map((entries) => Object.fromEntries(entries));
const anyState = fc
	.record({ freePacks: fc.nat(3), coins: fc.nat(25), collection, pendingPack })
	.map(aPlayerState);

const act = (state: PlayerState, step: Action, packSeed: number): PlayerState => {
	const result =
		step.do === 'add'
			? addPendingPack(state)
			: openPlayerPack(state, {
					kind: step.kind,
					cardSet: CARD_SET,
					random: createRandom(packSeed)
				});
	return result.ok ? result.value : state;
};
const sizeOf = (state: PlayerState): number =>
	Object.values(state.collection).reduce((total, copies) => total + copies, 0);

describe('player state properties', () => {
	it('never lets coins or free packs go below 0, for any sequence of actions', () => {
		fc.assert(
			fc.property(anyState, fc.array(action, { maxLength: 30 }), seed, (start, steps, packSeed) => {
				const states = steps.reduce(
					(seen, step) => [...seen, act(seen.at(-1) ?? start, step, packSeed)],
					[start]
				);

				expect(Math.min(...states.map((state) => state.coins))).toBeGreaterThanOrEqual(0);
				expect(Math.min(...states.map((state) => state.freePacks))).toBeGreaterThanOrEqual(0);
			})
		);
	});

	it('leaves the state as it was when an action is refused', () => {
		fc.assert(
			fc.property(anyState, kind, seed, (state, packKind, packSeed) => {
				const noCoins = { ...state, coins: 0, freePacks: 0 };
				const noPending = { ...state, pendingPack: null };
				const before = JSON.stringify([noCoins, noPending]);
				const pack = { kind: packKind, cardSet: CARD_SET, random: createRandom(packSeed) };

				const accepted = [openPlayerPack(noCoins, pack).ok, addPendingPack(noPending).ok];

				expect(accepted).toEqual([false, false]);
				expect(JSON.stringify([noCoins, noPending])).toBe(before);
			})
		);
	});

	it('grows the collection by the size of the pack when a pack is added', () => {
		fc.assert(
			fc.property(anyState, kind, seed, (state, packKind, packSeed) => {
				const ready = { ...state, coins: 10, pendingPack: null };
				const opened = act(ready, { do: 'open', kind: packKind }, packSeed);

				const added = act(opened, { do: 'add' }, packSeed);

				expect(sizeOf(added) - sizeOf(ready)).toBe(packKind === 'standard' ? 10 : 20);
				expect(added.pendingPack).toBeNull();
			})
		);
	});
});
