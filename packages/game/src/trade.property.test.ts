import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRandom, tradeCard } from './index.ts';
import type { PlayerState } from './index.ts';
import { aCardSet } from './testing/cards.ts';
import { aPlayerState } from './testing/state.ts';

const CARD_SET = aCardSet({ base: 8, rare: 4, legend: 2 });
const CARD_IDS = CARD_SET.map((card) => card.id);

const seed = fc.integer();
const cardId = fc.constantFrom(...CARD_IDS);
const collection = fc
	.array(fc.tuple(cardId, fc.integer({ min: 1, max: 9 })))
	.map((entries) => Object.fromEntries(entries));
const anyState = fc
	.record({ collection, favourites: fc.uniqueArray(cardId, { maxLength: 4 }) })
	.map(aPlayerState);
// A state with a double of the card to trade, so no rule refuses the trade.
const stateWithDouble = fc.tuple(anyState, cardId).map(([state, id]) => ({
	state: { ...state, collection: { ...state.collection, [id]: 2 } },
	id
}));

const tierOf = (id: string | undefined): string | undefined =>
	CARD_SET.find((card) => card.id === id)?.tier;
const sizeOf = (state: PlayerState | undefined): number =>
	Object.values(state?.collection ?? {}).reduce((total, copies) => total + copies, 0);

describe('trade properties', () => {
	it('gives a card of the same tier with a different id', () => {
		fc.assert(
			fc.property(stateWithDouble, seed, ({ state, id }, tradeSeed) => {
				const result = tradeCard(state, CARD_SET, id, createRandom(tradeSeed));

				const received = result.ok ? result.receivedCardId : undefined;

				expect(tierOf(received)).toBe(tierOf(id));
				expect(received).not.toBe(id);
			})
		);
	});

	it('keeps the total size of the collection the same', () => {
		fc.assert(
			fc.property(stateWithDouble, seed, ({ state, id }, tradeSeed) => {
				const result = tradeCard(state, CARD_SET, id, createRandom(tradeSeed));

				expect(result.ok).toBe(true);
				expect(sizeOf(result.ok ? result.value : undefined)).toBe(sizeOf(state));
			})
		);
	});

	it('leaves the given state equal to its snapshot when a trade is refused', () => {
		fc.assert(
			fc.property(anyState, cardId, seed, (state, id, tradeSeed) => {
				const lastFavourite = {
					...state,
					collection: { ...state.collection, [id]: 1 },
					favourites: [id]
				};
				const notOwned = { ...state, collection: {} };
				const before = JSON.stringify([lastFavourite, notOwned]);
				const random = createRandom(tradeSeed);

				const accepted = [
					tradeCard(lastFavourite, CARD_SET, id, random).ok,
					tradeCard(notOwned, CARD_SET, id, random).ok
				];

				expect(accepted).toEqual([false, false]);
				expect(JSON.stringify([lastFavourite, notOwned])).toBe(before);
			})
		);
	});
});
