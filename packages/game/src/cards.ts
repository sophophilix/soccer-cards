/** The stable id of one card in the set. */
export type CardId = string & { readonly __brand: 'CardId' };

/** The tiers of a card, in the order a pack reveals them. */
export const TIERS = ['base', 'rare', 'legend'] as const;

/** How rare a card is. */
export type Tier = (typeof TIERS)[number];

/** The part of a card the game rules need. */
export interface Card {
	readonly id: CardId;
	readonly tier: Tier;
	readonly attack: number;
	readonly defence: number;
	readonly control: number;
}

/** Turns a checked, non-empty string into a card id. */
export function toCardId(value: string): CardId {
	if (value.trim() === '') {
		throw new RangeError('a card id must not be empty');
	}
	// The one place a plain string becomes a card id, straight after the check.
	return value as CardId;
}

/** A card set that `checkCardSet` accepted: not empty, and every id listed once. */
export type CheckedCardSet = readonly Card[] & { readonly __brand: 'CheckedCardSet' };

/** The checked card set, or the reason the cards were refused. */
export type CardSetResult =
	| { readonly ok: true; readonly value: CheckedCardSet }
	| { readonly ok: false; readonly reason: 'empty-card-set' }
	| { readonly ok: false; readonly reason: 'repeated-card-id'; readonly cardId: CardId };

/** Checks that a card set is not empty and lists every card id once. */
export function checkCardSet(cards: readonly Card[]): CardSetResult {
	if (cards.length === 0) {
		return { ok: false, reason: 'empty-card-set' };
	}
	// A set, so a card id can never be mistaken for a built-in property of an object.
	const seen = new Set<CardId>();
	for (const card of cards) {
		if (seen.has(card.id)) {
			return { ok: false, reason: 'repeated-card-id', cardId: card.id };
		}
		seen.add(card.id);
	}
	// The one place a list of cards becomes a checked card set, straight after the check.
	return { ok: true, value: cards as CheckedCardSet };
}
