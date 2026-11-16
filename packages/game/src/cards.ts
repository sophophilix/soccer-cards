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
