import { describe, expect, it, vi } from 'vitest';
import { LUCKY_ODDS, PACK_CONTENTS, createRandom, drawPack, packSize } from './index.ts';
import type { Card, CardId, DrawPackResult, Random, Tier } from './index.ts';
import { aCheckedCardSet } from './testing/cards.ts';

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
		sample: <T>(items: readonly T[], count: number): T[] => items.slice(0, count)
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
});
