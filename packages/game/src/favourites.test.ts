import { describe, expect, it } from 'vitest';
import { addFavourite, isFavourite, removeFavourite, toCardId } from './index.ts';
import type { FavouriteRefusal, FavouriteResult, PlayerState } from './index.ts';
import { aPlayerState } from './testing/state.ts';

const MESSI = toCardId('legend-1');
const KANE = toCardId('rare-1');

const stateOf = (result: FavouriteResult<FavouriteRefusal>): PlayerState | undefined =>
	result.ok ? result.value : undefined;

describe('addFavourite', () => {
	it('returns a new state with the owned card in favourites', () => {
		const state = aPlayerState({ collection: { [MESSI]: 1, [KANE]: 2 }, favourites: [KANE] });

		const result = addFavourite(state, MESSI);

		expect(stateOf(result)).toEqual({ ...state, favourites: [KANE, MESSI] });
	});

	it('does not change the state it was given', () => {
		const state = aPlayerState({ collection: { [MESSI]: 1 }, favourites: [] });

		addFavourite(state, MESSI);

		expect(state).toEqual(aPlayerState({ collection: { [MESSI]: 1 }, favourites: [] }));
	});

	it('refuses a card the player does not own', () => {
		const state = aPlayerState({ collection: { [KANE]: 1 } });

		expect(addFavourite(state, MESSI)).toEqual({ ok: false, reason: 'card-not-owned' });
	});

	it('refuses a card whose name is a built-in property of an object', () => {
		const state = aPlayerState({ collection: { [KANE]: 1 } });

		const result = addFavourite(state, toCardId('constructor'));

		expect(result).toEqual({ ok: false, reason: 'card-not-owned' });
	});

	it('keeps the same favourites, with no repeat, when the card is already a favourite', () => {
		const state = aPlayerState({ collection: { [MESSI]: 3 }, favourites: [MESSI] });

		const result = addFavourite(state, MESSI);

		expect(stateOf(result)?.favourites).toEqual([MESSI]);
	});
});

describe('removeFavourite', () => {
	it('returns a new state without the card in favourites', () => {
		const state = aPlayerState({
			collection: { [MESSI]: 1, [KANE]: 1 },
			favourites: [MESSI, KANE]
		});

		const result = removeFavourite(state, MESSI);

		expect(stateOf(result)).toEqual({ ...state, favourites: [KANE] });
	});

	it('does not change the state it was given', () => {
		const state = aPlayerState({ collection: { [MESSI]: 1 }, favourites: [MESSI] });

		removeFavourite(state, MESSI);

		expect(state).toEqual(aPlayerState({ collection: { [MESSI]: 1 }, favourites: [MESSI] }));
	});

	it('refuses to remove a mark that is not there', () => {
		const state = aPlayerState({ collection: { [MESSI]: 1, [KANE]: 1 }, favourites: [KANE] });

		expect(removeFavourite(state, MESSI)).toEqual({ ok: false, reason: 'not-a-favourite' });
	});
});

describe('isFavourite', () => {
	it('answers true for a card in favourites', () => {
		const state = aPlayerState({ collection: { [MESSI]: 1 }, favourites: [MESSI] });

		expect(isFavourite(state, MESSI)).toBe(true);
	});

	it('answers false for a card that is not in favourites', () => {
		const state = aPlayerState({ collection: { [MESSI]: 1, [KANE]: 1 }, favourites: [KANE] });

		expect(isFavourite(state, MESSI)).toBe(false);
	});
});
