import type { CardId } from './cards.ts';
import type { PlayerState } from './state.ts';

/** Why a change to the player's favourites was refused. */
export type FavouriteRefusal = 'card-not-owned' | 'not-a-favourite';

/** The new player state, or the reason the action was refused. A refusal changes nothing. */
export type FavouriteResult<Reason extends FavouriteRefusal> =
	| { readonly ok: true; readonly value: PlayerState }
	| { readonly ok: false; readonly reason: Reason };

/** Answers whether the player has marked the card as a favourite. */
export function isFavourite(state: PlayerState, cardId: CardId): boolean {
	return state.favourites.includes(cardId);
}

/** Marks a card the player owns as a favourite. A card already marked stays marked once. */
export function addFavourite(
	state: PlayerState,
	cardId: CardId
): FavouriteResult<'card-not-owned'> {
	// An own-property check, so a card id can never be mistaken for a built-in property.
	const copies = Object.hasOwn(state.collection, cardId) ? (state.collection[cardId] ?? 0) : 0;
	if (copies < 1) {
		return { ok: false, reason: 'card-not-owned' };
	}
	if (isFavourite(state, cardId)) {
		return { ok: true, value: { ...state } };
	}
	return { ok: true, value: { ...state, favourites: [...state.favourites, cardId] } };
}

/** Takes the favourite mark off a card. */
export function removeFavourite(
	state: PlayerState,
	cardId: CardId
): FavouriteResult<'not-a-favourite'> {
	if (!isFavourite(state, cardId)) {
		return { ok: false, reason: 'not-a-favourite' };
	}
	return {
		ok: true,
		value: { ...state, favourites: state.favourites.filter((id) => id !== cardId) }
	};
}
