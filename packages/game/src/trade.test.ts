import { describe, expect, it, vi } from 'vitest';
import { createRandom, toCardId, tradeCard } from './index.ts';
import type { CardId, PlayerState, Random, TradeResult } from './index.ts';
import { aCard, aCardSet } from './testing/cards.ts';
import { aPlayerState } from './testing/state.ts';

const SEED = 20261116;
const CARD_SET = aCardSet({ base: 6, rare: 4, legend: 1 });
const BASE_1 = toCardId('base-1');
const RARE_1 = toCardId('rare-1');
const RARE_IDS = CARD_SET.filter((card) => card.tier === 'rare').map((card) => card.id);

const stateOf = (result: TradeResult): PlayerState | undefined =>
	result.ok ? result.value : undefined;
const receivedOf = (result: TradeResult): CardId | undefined =>
	result.ok ? result.receivedCardId : undefined;
const trade = (state: PlayerState, cardId: CardId, cardSet = CARD_SET): TradeResult =>
	tradeCard(state, cardSet, cardId, createRandom(SEED));

describe('tradeCard', () => {
	it('names a different card of the same tier as the card received', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 2 } });

		const received = receivedOf(trade(state, RARE_1));

		expect(RARE_IDS.filter((id) => id !== RARE_1)).toContain(received);
	});

	it('removes one copy of the card and adds one copy of the card received', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 3, [BASE_1]: 1 }, coins: 4 });

		const result = trade(state, RARE_1);

		expect(stateOf(result)).toEqual({
			...state,
			collection: { [RARE_1]: 2, [BASE_1]: 1, [receivedOf(result) ?? '']: 1 }
		});
	});

	it('adds a copy to a card the player already owns', () => {
		const twoRares = [aCard({ id: RARE_1, tier: 'rare' }), aCard({ id: BASE_1, tier: 'rare' })];
		const state = aPlayerState({ collection: { [RARE_1]: 2, [BASE_1]: 4 } });

		const result = trade(state, RARE_1, twoRares);

		expect(stateOf(result)?.collection).toEqual({ [RARE_1]: 1, [BASE_1]: 5 });
	});

	it('takes the card out of the collection when its last copy leaves', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 1 } });

		const result = trade(state, RARE_1);

		expect(stateOf(result)?.collection).toEqual({ [receivedOf(result) ?? '']: 1 });
	});

	it('refuses a trade of the last copy of a favourite', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 1 }, favourites: [RARE_1] });

		expect(trade(state, RARE_1)).toEqual({ ok: false, reason: 'last-favourite' });
	});

	it('trades a double of a favourite and keeps the star', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 2 }, favourites: [RARE_1] });

		const traded = stateOf(trade(state, RARE_1));

		expect(traded?.collection[RARE_1]).toBe(1);
		expect(traded?.favourites).toEqual([RARE_1]);
	});

	it('does not change the state it was given', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 1, [BASE_1]: 2 } });

		trade(state, RARE_1);

		expect(state).toEqual(aPlayerState({ collection: { [RARE_1]: 1, [BASE_1]: 2 } }));
	});

	it('refuses a card the player does not own', () => {
		const state = aPlayerState({ collection: { [BASE_1]: 1 } });

		expect(trade(state, RARE_1)).toEqual({ ok: false, reason: 'card-not-owned' });
	});

	it('refuses a card when its tier has no other card in the set', () => {
		const legend = toCardId('legend-1');
		const state = aPlayerState({ collection: { [legend]: 2 } });

		expect(trade(state, legend)).toEqual({ ok: false, reason: 'no-other-card' });
	});

	it('refuses a card that is not in the card set', () => {
		const stranger = toCardId('not-in-the-set');
		const state = aPlayerState({ collection: { [stranger]: 2 } });

		expect(trade(state, stranger)).toEqual({ ok: false, reason: 'card-not-in-set' });
	});

	it('refuses a card whose name is a built-in property of an object', () => {
		const builtIn = toCardId('constructor');
		const cardSet = [...CARD_SET, aCard({ id: builtIn, tier: 'rare' })];
		const state = aPlayerState({ collection: { [RARE_1]: 1 } });

		expect(trade(state, builtIn, cardSet)).toEqual({ ok: false, reason: 'card-not-owned' });
	});

	it('draws nothing from the generator when it refuses', () => {
		const legend = toCardId('legend-1');
		const random = createRandom(SEED);
		const nextInt = vi.spyOn(random, 'nextInt');

		tradeCard(aPlayerState({ collection: { [legend]: 2 } }), CARD_SET, legend, random);

		expect(nextInt).not.toHaveBeenCalled();
	});

	it('gives the card at the place the generator picks', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 2 } });
		const pickLast: Random = { nextInt: (_min, max) => max, sample: () => [] };

		const result = tradeCard(state, CARD_SET, RARE_1, pickLast);

		expect(receivedOf(result)).toBe(toCardId('rare-4'));
	});

	it('throws when the generator picks a place outside the list', () => {
		const state = aPlayerState({ collection: { [RARE_1]: 2 } });
		const pickPastEnd: Random = { nextInt: (_min, max) => max + 1, sample: () => [] };

		expect(() => tradeCard(state, CARD_SET, RARE_1, pickPastEnd)).toThrow(RangeError);
	});

	it('gives the same card received for the same seed', () => {
		const state = aPlayerState({ collection: { [BASE_1]: 1 } });

		const first = receivedOf(trade(state, BASE_1));
		const second = receivedOf(trade(state, BASE_1));

		expect(first).toBeDefined();
		expect(second).toBe(first);
	});
});
