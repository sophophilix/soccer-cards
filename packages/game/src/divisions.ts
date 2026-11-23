import type { CardId, CheckedCardSet, Tier } from './cards.ts';
import { drawPack } from './draw-pack.ts';
import { WIN_COINS_BY_DIVISION } from './economy.ts';
import { FORMATIONS, TEAM_SIZE, bestTeam } from './lineup.ts';
import type { Formation } from './lineup.ts';
import { TACTIC_IDS } from './match.ts';
import type { Tactic } from './match.ts';
import type { Random } from './random.ts';

/**
 * The divisions, from the bottom. The computer opens `packs` standard packs for its side,
 * a win pays `winCoins`, and `formPercent` lifts every line of the computer's side.
 */
export const DIVISIONS = [
	{ id: 'division-4', packs: 2, winCoins: WIN_COINS_BY_DIVISION['division-4'], formPercent: 0 },
	{ id: 'division-3', packs: 6, winCoins: WIN_COINS_BY_DIVISION['division-3'], formPercent: 0 },
	{ id: 'division-2', packs: 15, winCoins: WIN_COINS_BY_DIVISION['division-2'], formPercent: 0 },
	{ id: 'division-1', packs: 35, winCoins: WIN_COINS_BY_DIVISION['division-1'], formPercent: 0 },
	{
		id: 'champions-league',
		packs: 80,
		winCoins: WIN_COINS_BY_DIVISION['champions-league'],
		formPercent: 1
	}
] as const;

/** One division of the league. */
export type Division = (typeof DIVISIONS)[number];

// Past this many packs the computer gives up looking for an 11th different card. With the
// real odds, a set that holds 11 different cards is all but certain to give them long before.
const MAX_PACKS_FOR_A_SIDE = 1000;

/** The computer's side: its formation, its tactic, its form bonus in percent and its team. */
export interface ComputerSide {
	readonly formation: Formation;
	readonly tactic: Tactic;
	readonly formPercent: number;
	readonly team: readonly CardId[];
}

/** The computer's side, or the reason it couldn't field one. */
export type ComputerSideResult =
	| { readonly ok: true; readonly value: ComputerSide }
	| { readonly ok: false; readonly reason: 'not-enough-cards'; readonly tier: Tier }
	| { readonly ok: false; readonly reason: 'not-eleven-different-cards' };

const FORMATION_NAMES = Object.keys(FORMATIONS).filter(
	(name): name is Formation => name in FORMATIONS
);

function pickOne<T>(items: readonly T[], fallback: T, random: Random): T {
	return items[random.nextInt(0, items.length - 1)] ?? fallback;
}

/** Opens the division's packs, then more until 11 different cards, and fields the best team. */
export function computerSide(
	division: Division,
	cardSet: CheckedCardSet,
	random: Random
): ComputerSideResult {
	if (cardSet.length < TEAM_SIZE) {
		return { ok: false, reason: 'not-eleven-different-cards' };
	}
	const opened = new Set<CardId>();
	let packs = 0;
	while (packs < MAX_PACKS_FOR_A_SIDE && (packs < division.packs || opened.size < TEAM_SIZE)) {
		const pack = drawPack(cardSet, 'standard', random);
		if (!pack.ok) {
			return pack;
		}
		pack.value.forEach((id) => opened.add(id));
		packs += 1;
	}
	if (opened.size < TEAM_SIZE) {
		return { ok: false, reason: 'not-eleven-different-cards' };
	}
	const formation = pickOne(FORMATION_NAMES, '4-4-2', random);
	const tactic = pickOne(TACTIC_IDS, 'possession', random);
	return {
		ok: true,
		value: {
			formation,
			tactic,
			formPercent: division.formPercent,
			team: bestTeam(cardSet, [...opened], formation)
		}
	};
}
