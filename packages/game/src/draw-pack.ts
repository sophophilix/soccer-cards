import { TIERS } from './cards.ts';
import type { CardId, CheckedCardSet, Tier } from './cards.ts';
import type { Random } from './random.ts';

/** The packs a player can open. */
export type PackKind = 'standard' | 'jumbo';

type LuckyTier = Exclude<Tier, 'base'>;

/** How many base cards and lucky cards each kind of pack holds. */
export const PACK_CONTENTS = {
	standard: { base: 8, lucky: 2 },
	jumbo: { base: 40, lucky: 10 }
} as const satisfies Readonly<Record<PackKind, { readonly base: number; readonly lucky: number }>>;

/** The chances out of 100 that a lucky card has each tier. */
export const LUCKY_ODDS = { rare: 85, legend: 12, icon: 3 } as const;

const LUCKY_ODDS_TOTAL = 100;

/** The cards of a drawn pack, or the tier the card set has no card of. */
export type DrawPackResult =
	| { readonly ok: true; readonly value: readonly CardId[] }
	| { readonly ok: false; readonly reason: 'not-enough-cards'; readonly tier: Tier };

/** Returns the number of cards in a kind of pack. */
export function packSize(kind: PackKind): number {
	return PACK_CONTENTS[kind].base + PACK_CONTENTS[kind].lucky;
}

// A roll from 1 to 85 is Rare, from 86 to 97 Legend and from 98 to 100 Icon.
function rollLuckyTier(random: Random): LuckyTier {
	const roll = random.nextInt(1, LUCKY_ODDS_TOTAL);
	if (roll <= LUCKY_ODDS.rare) {
		return 'rare';
	}
	return roll <= LUCKY_ODDS.rare + LUCKY_ODDS.legend ? 'legend' : 'icon';
}

/** Draws a pack: its base cards, then its lucky cards from Rare to Icon. */
export function drawPack(cardSet: CheckedCardSet, kind: PackKind, random: Random): DrawPackResult {
	const idsOf = (tier: Tier): CardId[] =>
		cardSet.filter((card) => card.tier === tier).map((card) => card.id);

	// Every tier is checked before any draw, so a refusal uses no random number.
	const emptyTier = TIERS.find((tier) => idsOf(tier).length === 0);
	if (emptyTier !== undefined) {
		return { ok: false, reason: 'not-enough-cards', tier: emptyTier };
	}

	const contents = PACK_CONTENTS[kind];
	const baseIds = idsOf('base');
	let base: CardId[] = [];
	// Each pass deals a base card at most once, so a small set repeats evenly.
	while (base.length < contents.base) {
		const count = Math.min(baseIds.length, contents.base - base.length);
		base = [...base, ...random.sample(baseIds, count)];
	}

	const lucky: Record<LuckyTier, CardId[]> = { rare: [], legend: [], icon: [] };
	for (let drawn = 0; drawn < contents.lucky; drawn += 1) {
		const tier = rollLuckyTier(random);
		const pool = idsOf(tier);
		const fresh = pool.filter((id) => !lucky[tier].includes(id));
		lucky[tier].push(...random.sample(fresh.length > 0 ? fresh : pool, 1));
	}

	// The best card comes last, so the reveal builds up.
	return { ok: true, value: [...base, ...lucky.rare, ...lucky.legend, ...lucky.icon] };
}
