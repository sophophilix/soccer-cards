import { TIERS } from './cards.ts';
import type { Card, CardId, CheckedCardSet, Tier } from './cards.ts';
import type { Random } from './random.ts';

/** The packs a player can open. */
export type PackKind = 'standard' | 'jumbo';

type LuckyTier = Exclude<Tier, 'base'>;

/** How many base cards and lucky cards each kind of pack holds. */
export const PACK_CONTENTS = {
	standard: { base: 8, lucky: 2 },
	jumbo: { base: 40, lucky: 10 }
} as const satisfies Readonly<Record<PackKind, { readonly base: number; readonly lucky: number }>>;

/** The most cards from one national team a pack holds, when the card set allows it. */
export const PACK_TEAM_LIMIT = { standard: 3, jumbo: 15 } as const satisfies Readonly<
	Record<PackKind, number>
>;

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

/**
 * Swaps cards over the team limit for cards of the same tier from other teams.
 * A card stays when no other card of its tier is free, so the pack is always full.
 */
function limitTeams(
	pack: readonly CardId[],
	cardSet: CheckedCardSet,
	limit: number,
	random: Random
): CardId[] {
	const byId = new Map<CardId, Card>(cardSet.map((card) => [card.id, card]));
	const teamOf = (id: CardId): string | undefined => byId.get(id)?.nationalTeam;
	const counts = new Map<string, number>();
	const countOf = (team: string | undefined): number =>
		team === undefined ? 0 : (counts.get(team) ?? 0);
	const shift = (team: string | undefined, change: number): void => {
		if (team !== undefined) {
			counts.set(team, countOf(team) + change);
		}
	};
	for (const id of pack) {
		shift(teamOf(id), 1);
	}

	const result = [...pack];
	// From the end, so a lucky card is swapped before a base card.
	for (let index = result.length - 1; index >= 0; index -= 1) {
		const id = result[index];
		const team = id === undefined ? undefined : teamOf(id);
		if (id === undefined || countOf(team) <= limit) {
			continue;
		}
		const tier = byId.get(id)?.tier;
		const free = cardSet
			.filter(
				(card) =>
					card.tier === tier && countOf(card.nationalTeam) < limit && !result.includes(card.id)
			)
			.map((card) => card.id);
		const [swap] = free.length > 0 ? random.sample(free, 1) : [];
		if (swap !== undefined) {
			shift(team, -1);
			shift(teamOf(swap), 1);
			result[index] = swap;
		}
	}
	return result;
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
	const pack = [...base, ...lucky.rare, ...lucky.legend, ...lucky.icon];
	// After every roll, so the limit never changes which tier a lucky card has.
	return { ok: true, value: limitTeams(pack, cardSet, PACK_TEAM_LIMIT[kind], random) };
}
