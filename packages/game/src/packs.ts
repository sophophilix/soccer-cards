import { TIERS } from './cards.ts';
import type { Card, CardId, Tier } from './cards.ts';
import type { Random } from './random.ts';

/** The packs a player can open. */
export type PackKind = 'standard' | 'jumbo';

/** How many cards of each tier a pack holds. */
export type PackMix = Readonly<Record<Tier, number>>;

/** The mix of a standard pack. */
export const STANDARD_PACK_MIX = { base: 7, rare: 2, legend: 1 } as const satisfies PackMix;
/** The mix of a jumbo pack. */
export const JUMBO_PACK_MIX = { base: 15, rare: 3, legend: 2 } as const satisfies PackMix;
/** The number of cards in a standard pack. */
export const STANDARD_PACK_SIZE = 10;
/** The number of cards in a jumbo pack. */
export const JUMBO_PACK_SIZE = 20;

/** The cards of an opened pack, or the tier the card set is too small to fill. */
export type OpenPackResult =
	| { readonly ok: true; readonly value: readonly CardId[] }
	| { readonly ok: false; readonly reason: 'not-enough-cards'; readonly tier: Tier };

/** Returns the mix of tiers for a kind of pack. */
export function packMix(kind: PackKind): PackMix {
	switch (kind) {
		case 'standard':
			return STANDARD_PACK_MIX;
		case 'jumbo':
			return JUMBO_PACK_MIX;
		default: {
			const unknownKind: never = kind;
			throw new RangeError(`unknown pack kind: ${String(unknownKind)}`);
		}
	}
}

/** Opens a pack: draws its mix from the card set and returns the ids in reveal order. */
export function openPack(cardSet: readonly Card[], kind: PackKind, random: Random): OpenPackResult {
	const mix = packMix(kind);
	// A map keeps the first listing of each id, so a card listed twice, even
	// under two tiers, appears once in a pack.
	const tierById = new Map<CardId, Tier>();
	for (const card of cardSet) {
		if (!tierById.has(card.id)) {
			tierById.set(card.id, card.tier);
		}
	}
	const idsByTier = TIERS.map((tier) => ({
		tier,
		ids: [...tierById].filter(([, cardTier]) => cardTier === tier).map(([id]) => id)
	}));

	// Every tier is checked before any draw, so a refusal uses no random numbers.
	const short = idsByTier.find(({ tier, ids }) => ids.length < mix[tier]);
	if (short !== undefined) {
		return { ok: false, reason: 'not-enough-cards', tier: short.tier };
	}

	return {
		ok: true,
		value: idsByTier.flatMap(({ tier, ids }) => random.sample(ids, mix[tier]))
	};
}
