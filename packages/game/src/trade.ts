import type { Card, CardId } from './cards.ts';
import { isFavourite } from './favourites.ts';
import type { Random } from './random.ts';
import type { PlayerState } from './state.ts';

/** Why a trade was refused. */
export type TradeRefusal =
	'card-not-in-set' | 'card-not-owned' | 'last-favourite' | 'no-other-card';

/** The new player state and the card received, or the reason the trade was refused. */
export type TradeResult =
	| { readonly ok: true; readonly value: PlayerState; readonly receivedCardId: CardId }
	| { readonly ok: false; readonly reason: TradeRefusal };

/** Swaps one copy of a card for one copy of a different card of the same tier. */
export function tradeCard(
	state: PlayerState,
	cardSet: readonly Card[],
	cardId: CardId,
	random: Random
): TradeResult {
	const given = cardSet.find((card) => card.id === cardId);
	if (given === undefined) {
		return { ok: false, reason: 'card-not-in-set' };
	}
	// A map, so a card id can never be mistaken for a built-in property of an object.
	const copies = new Map<string, number>(Object.entries(state.collection));
	const held = copies.get(cardId) ?? 0;
	if (held < 1) {
		return { ok: false, reason: 'card-not-owned' };
	}
	if (held === 1 && isFavourite(state, cardId)) {
		return { ok: false, reason: 'last-favourite' };
	}
	const others = cardSet.filter((card) => card.tier === given.tier && card.id !== cardId);
	// Checked before the draw, so a refusal uses no random numbers.
	if (others.length === 0) {
		return { ok: false, reason: 'no-other-card' };
	}
	const received = others[random.nextInt(0, others.length - 1)];
	if (received === undefined) {
		throw new RangeError('the generator picked a place outside the list of cards');
	}
	copies.set(cardId, held - 1);
	if (held === 1) {
		copies.delete(cardId);
	}
	copies.set(received.id, (copies.get(received.id) ?? 0) + 1);
	return {
		ok: true,
		value: { ...state, collection: Object.fromEntries(copies) },
		receivedCardId: received.id
	};
}
