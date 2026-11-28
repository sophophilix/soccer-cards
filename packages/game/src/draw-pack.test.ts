import { describe, expect, it, vi } from 'vitest';
import {
	LUCKY_ODDS,
	PACK_CONTENTS,
	PACK_TEAM_LIMIT,
	createRandom,
	drawPack,
	packSize,
	toCardId
} from './index.ts';
import type { Card, CardId, DrawPackResult, Random, Tier } from './index.ts';
import { aCardSet, aCheckedCardSet, aCheckedCardSetOf } from './testing/cards.ts';

const SEED = 20261116;
const PLENTY = { base: 60, rare: 12, legend: 6, icon: 3 };
const RARE_ROLL = 1;
const LEGEND_ROLL = 86;
const ICON_ROLL = 100;

const idsOf = (result: DrawPackResult): readonly CardId[] => (result.ok ? result.value : []);
const tiersOf = (cardSet: readonly Card[], ids: readonly CardId[]): (Tier | undefined)[] =>
	ids.map((id) => cardSet.find((card) => card.id === id)?.tier);
const repeat = <T>(item: T, count: number): T[] => Array.from({ length: count }, () => item);

/** A generator that gives each lucky card the next roll and always picks the first cards. */
function aRandomThatRolls(rolls: readonly number[]): Random {
	const queue = [...rolls];
	return {
		nextInt: () => queue.shift() ?? RARE_ROLL,
		sample: <T>(items: readonly T[], count: number): T[] => items.slice(0, count),
		chance: () => false
	};
}

describe('drawPack', () => {
	it.each([
		['standard', 8, 2],
		['jumbo', 40, 10]
	] as const)(
		'gives a %s pack of %i base cards, then %i lucky cards',
		(kind, baseCount, luckyCount) => {
			const cardSet = aCheckedCardSet(PLENTY);

			const tiers = tiersOf(cardSet, idsOf(drawPack(cardSet, kind, createRandom(SEED))));

			expect(tiers).toHaveLength(baseCount + luckyCount);
			expect(tiers.slice(0, baseCount)).toEqual(repeat('base', baseCount));
			expect(tiers.slice(baseCount)).not.toContain('base');
		}
	);

	it('states the contents and the size of each kind of pack', () => {
		expect(PACK_CONTENTS).toEqual({
			standard: { base: 8, lucky: 2 },
			jumbo: { base: 40, lucky: 10 }
		});
		expect(packSize('standard')).toBe(10);
		expect(packSize('jumbo')).toBe(50);
	});

	it('states odds that add up to 100: Rare 85, Legend 12, Icon 3', () => {
		expect(LUCKY_ODDS).toEqual({ rare: 85, legend: 12, icon: 3 });
		expect(LUCKY_ODDS.rare + LUCKY_ODDS.legend + LUCKY_ODDS.icon).toBe(100);
	});

	it.each([
		[85, 'rare'],
		[86, 'legend'],
		[97, 'legend'],
		[98, 'icon']
	] as const)('turns a roll of %i out of 100 into a lucky card of tier %s', (roll, tier) => {
		const cardSet = aCheckedCardSet(PLENTY);

		const ids = idsOf(drawPack(cardSet, 'standard', aRandomThatRolls([roll, roll])));

		expect(tiersOf(cardSet, ids.slice(8))).toEqual([tier, tier]);
	});

	it('rolls each lucky card from 1 to 100', () => {
		const random = aRandomThatRolls([]);
		const nextInt = vi.spyOn(random, 'nextInt');

		drawPack(aCheckedCardSet(PLENTY), 'standard', random);

		expect(nextInt.mock.calls).toEqual([
			[1, 100],
			[1, 100]
		]);
	});

	it('gives base cards that are different from each other', () => {
		const ids = idsOf(drawPack(aCheckedCardSet(PLENTY), 'jumbo', createRandom(SEED)));

		expect(new Set(ids.slice(0, 40)).size).toBe(40);
	});

	it('gives each of 25 base cards one or two times in a jumbo pack', () => {
		const cardSet = aCheckedCardSet({ ...PLENTY, base: 25 });

		const base = idsOf(drawPack(cardSet, 'jumbo', createRandom(SEED))).slice(0, 40);

		const counts = cardSet
			.filter((card) => card.tier === 'base')
			.map((card) => base.filter((id) => id === card.id).length);
		expect(counts.toSorted()).toEqual([...repeat(1, 10), ...repeat(2, 15)]);
	});

	it('gives a lucky card the pack does not hold yet when its tier has one left', () => {
		const random = aRandomThatRolls([RARE_ROLL, RARE_ROLL]);

		const ids = idsOf(drawPack(aCheckedCardSet(PLENTY), 'standard', random));

		expect(ids.slice(8)).toEqual(['rare-1', 'rare-2']);
	});

	it('repeats the only Icon when both lucky cards roll Icon', () => {
		const random = aRandomThatRolls([ICON_ROLL, ICON_ROLL]);

		const ids = idsOf(drawPack(aCheckedCardSet({ ...PLENTY, icon: 1 }), 'standard', random));

		expect(ids.slice(8)).toEqual(['icon-1', 'icon-1']);
	});

	it('lists the lucky cards from Rare to Icon, whatever order they were rolled in', () => {
		const random = aRandomThatRolls([ICON_ROLL, LEGEND_ROLL]);

		const ids = idsOf(drawPack(aCheckedCardSet(PLENTY), 'standard', random));

		expect(ids.slice(8)).toEqual(['legend-1', 'icon-1']);
	});

	it('fills a pack from a set with exactly one card in each tier', () => {
		const cardSet = aCheckedCardSet({ base: 1, rare: 1, legend: 1, icon: 1 });

		const ids = idsOf(drawPack(cardSet, 'standard', aRandomThatRolls([RARE_ROLL, LEGEND_ROLL])));

		expect(ids).toEqual([...repeat('base-1', 8), 'rare-1', 'legend-1']);
	});

	it.each([
		['base', { ...PLENTY, base: 0 }],
		['legend', { ...PLENTY, legend: 0 }],
		['icon', { ...PLENTY, icon: 0 }],
		['rare', { ...PLENTY, rare: 0, icon: 0 }]
	] as const)('refuses a set with no %s card before any draw', (tier, counts) => {
		const random = createRandom(SEED);
		const nextInt = vi.spyOn(random, 'nextInt');
		const sample = vi.spyOn(random, 'sample');

		const result = drawPack(aCheckedCardSet(counts), 'standard', random);

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards', tier });
		expect(nextInt).not.toHaveBeenCalled();
		expect(sample).not.toHaveBeenCalled();
	});

	describe('with a limit on cards from one national team', () => {
		const teamOf = (cardSet: readonly Card[], id: CardId): string | undefined =>
			cardSet.find((card) => card.id === id)?.nationalTeam;
		const countTeam = (cardSet: readonly Card[], ids: readonly CardId[], team: string): number =>
			ids.filter((id) => teamOf(cardSet, id) === team).length;
		// Every card of a tier named in `tiers` comes from one team; the rest have none.
		const withTeams = (counts: typeof PLENTY, tiers: readonly Tier[]): Card[] =>
			aCardSet(counts).map((card) =>
				tiers.includes(card.tier) ? { ...card, nationalTeam: 'AUS' } : card
			);
		const halfAustralian = (): Card[] =>
			aCardSet(PLENTY).map((card, index) =>
				card.tier === 'base' && index % 2 === 0 ? { ...card, nationalTeam: 'AUS' } : card
			);

		it('states a limit of 3 for a standard pack and 15 for a jumbo pack', () => {
			expect(PACK_TEAM_LIMIT).toEqual({ standard: 3, jumbo: 15 });
		});

		it.each([
			['standard', 3],
			['jumbo', 15]
		] as const)('holds at most the limit from one team in a %s pack', (kind, limit) => {
			const australian = aCardSet({ base: 30, rare: 0, legend: 0 }).map((card) => ({
				...card,
				id: toCardId(`aus-${card.id}`),
				nationalTeam: 'AUS'
			}));
			const others = aCardSet({ base: 30, rare: 12, legend: 6, icon: 3 });
			const cardSet = aCheckedCardSetOf([...australian, ...others]);

			for (let seed = 0; seed < 20; seed += 1) {
				const ids = idsOf(drawPack(cardSet, kind, createRandom(seed)));

				expect(ids).toHaveLength(packSize(kind));
				expect(countTeam(cardSet, ids, 'AUS')).toBeLessThanOrEqual(limit);
			}
		});

		it('still fills a pack when every card comes from one team', () => {
			const cardSet = aCheckedCardSetOf(withTeams(PLENTY, ['base', 'rare', 'legend', 'icon']));

			const ids = idsOf(drawPack(cardSet, 'standard', createRandom(SEED)));

			expect(ids).toHaveLength(10);
			expect(countTeam(cardSet, ids, 'AUS')).toBe(10);
		});

		it('keeps the rolled tier when the only cards of that tier come from a full team', () => {
			const cardSet = aCheckedCardSetOf(withTeams(PLENTY, ['rare']));

			const ids = idsOf(drawPack(cardSet, 'standard', aRandomThatRolls([RARE_ROLL, RARE_ROLL])));

			expect(tiersOf(cardSet, ids.slice(8))).toEqual(['rare', 'rare']);
		});

		it('does not count cards with no national team', () => {
			const cardSet = aCheckedCardSet(PLENTY);

			const ids = idsOf(drawPack(cardSet, 'standard', aRandomThatRolls([RARE_ROLL, RARE_ROLL])));

			expect(ids).toEqual([
				'base-1',
				'base-2',
				'base-3',
				'base-4',
				'base-5',
				'base-6',
				'base-7',
				'base-8',
				'rare-1',
				'rare-2'
			]);
		});

		it('swaps only the cards over the limit, for cards of the same tier', () => {
			const cardSet = aCheckedCardSetOf(halfAustralian());

			const ids = idsOf(drawPack(cardSet, 'standard', aRandomThatRolls([RARE_ROLL, RARE_ROLL])));

			expect(tiersOf(cardSet, ids)).toEqual([...repeat('base', 8), 'rare', 'rare']);
			expect(countTeam(cardSet, ids, 'AUS')).toBe(3);
			expect(new Set(ids).size).toBe(10);
		});

		it('gives the same pack for the same seed', () => {
			const cardSet = aCheckedCardSetOf(halfAustralian());

			expect(drawPack(cardSet, 'standard', createRandom(SEED))).toEqual(
				drawPack(cardSet, 'standard', createRandom(SEED))
			);
		});

		it('fills a small set that repeats base cards from the cards the limit left out', () => {
			const cards = aCardSet({ base: 2, rare: 1, legend: 1, icon: 1 }).map((card, index) =>
				index === 0 ? { ...card, nationalTeam: 'AUS' } : card
			);
			const cardSet = aCheckedCardSetOf(cards);

			const ids = idsOf(drawPack(cardSet, 'standard', aRandomThatRolls([RARE_ROLL, RARE_ROLL])));

			expect(ids).toHaveLength(10);
			expect(countTeam(cardSet, ids, 'AUS')).toBeLessThanOrEqual(4);
		});
	});
});
