import { describe, expect, it, vi } from 'vitest';
import { DIVISIONS, computerSide, createRandom, toCardId } from './index.ts';
import type { ComputerSideResult, Division, Random } from './index.ts';
import { aCard, aCardSet, aCheckedCardSet, aCheckedCardSetOf } from './testing/cards.ts';

const SEED = 20261116;
const PLENTY = { base: 60, rare: 12, legend: 6, icon: 3 };
const ELEVEN = { base: 8, rare: 1, legend: 1, icon: 1 };
const LUCKY_ROLL_MAX = 100;
const RARE_ROLL = 1;
const LEGEND_ROLL = 86;
const ICON_ROLL = 100;

const [divisionFour, , , , championsLeague] = DIVISIONS;

/** A generator that gives each lucky card the next roll, picks `choice` from every list and the first cards. */
function aRandomThatRolls(rolls: readonly number[], choice = 0): Random {
	const queue = [...rolls];
	return {
		// Only a lucky card's tier is rolled from 1 to 100.
		nextInt: (min, max) => (max === LUCKY_ROLL_MAX ? (queue.shift() ?? RARE_ROLL) : min + choice),
		sample: <T>(items: readonly T[], count: number): T[] => items.slice(0, count),
		chance: () => false
	};
}

/** Starts counting the lucky card rolls of a generator, and returns the count so far. */
const countLuckyRolls = (random: Random): (() => number) => {
	const nextInt = vi.spyOn(random, 'nextInt');
	return () => nextInt.mock.calls.filter(([, max]) => max === LUCKY_ROLL_MAX).length;
};
const sortedTeam = (result: ComputerSideResult): string[] =>
	result.ok ? result.value.team.toSorted() : [];

describe('DIVISIONS', () => {
	it('lists the divisions from the bottom, with their packs, coins and form', () => {
		expect(DIVISIONS).toEqual([
			{ id: 'division-4', packs: 2, winCoins: 4, formPercent: 0 },
			{ id: 'division-3', packs: 6, winCoins: 5, formPercent: 0 },
			{ id: 'division-2', packs: 15, winCoins: 6, formPercent: 0 },
			{ id: 'division-1', packs: 35, winCoins: 8, formPercent: 0 },
			{ id: 'champions-league', packs: 80, winCoins: 10, formPercent: 1 }
		]);
	});
});

describe('computerSide', () => {
	it.each(DIVISIONS.map((division) => [division.id, division] as const))(
		'opens the standard packs of %s',
		(_, division: Division) => {
			const random = createRandom(SEED);
			const luckyRolls = countLuckyRolls(random);

			computerSide(division, aCheckedCardSet(PLENTY), random);

			expect(luckyRolls()).toBe(division.packs * 2);
		}
	);

	it('keeps opening packs until it holds 11 different cards', () => {
		const random = aRandomThatRolls([RARE_ROLL, LEGEND_ROLL, RARE_ROLL, RARE_ROLL, ICON_ROLL]);
		const luckyRolls = countLuckyRolls(random);

		const result = computerSide(divisionFour, aCheckedCardSet(ELEVEN), random);

		expect(luckyRolls()).toBe(6);
		expect(result.ok).toBe(true);
	});

	it('fields exactly the 11 cards of a set of 11', () => {
		const cardSet = aCheckedCardSet(ELEVEN);
		const random = aRandomThatRolls([RARE_ROLL, LEGEND_ROLL, ICON_ROLL]);

		const result = computerSide(divisionFour, cardSet, random);

		expect(sortedTeam(result)).toEqual(cardSet.map((card) => card.id).toSorted());
	});

	it('leaves the weakest of 12 opened cards out of its best team', () => {
		const weak = aCard({ id: toCardId('rare-2'), tier: 'rare', overall: 1, control: 1 });
		const cardSet = aCheckedCardSetOf(aCardSet(ELEVEN).concat(weak));
		const random = aRandomThatRolls([RARE_ROLL, RARE_ROLL, LEGEND_ROLL, ICON_ROLL]);

		const result = computerSide(divisionFour, cardSet, random);

		expect(sortedTeam(result)).toHaveLength(11);
		expect(sortedTeam(result)).not.toContain('rare-2');
	});

	it('fields only cards it opened, never the rest of the set', () => {
		const strong = aCard({ id: toCardId('base-9'), overall: 99, control: 99 });
		const cardSet = aCheckedCardSetOf(aCardSet(ELEVEN).concat(strong));
		const random = aRandomThatRolls([RARE_ROLL, LEGEND_ROLL, ICON_ROLL]);

		const result = computerSide(divisionFour, cardSet, random);

		expect(sortedTeam(result)).not.toContain('base-9');
	});

	it.each([
		[0, '4-4-2', 'attack'],
		[3, '5-3-2', 'defend']
	] as const)('picks formation and tactic number %i: %s and %s', (choice, formation, tactic) => {
		const random = aRandomThatRolls([RARE_ROLL, LEGEND_ROLL, ICON_ROLL], choice);

		const result = computerSide(divisionFour, aCheckedCardSet(ELEVEN), random);

		expect(result).toMatchObject({ ok: true, value: { formation, tactic } });
	});

	it.each([
		[divisionFour, 0],
		[championsLeague, 1]
	] as const)('gives the side of $id a form bonus of %i', (division, formPercent) => {
		const result = computerSide(division, aCheckedCardSet(PLENTY), createRandom(SEED));

		expect(result).toMatchObject({ ok: true, value: { formPercent } });
	});

	it('gives the same side for the same seed', () => {
		const cardSet = aCheckedCardSet(PLENTY);

		const first = computerSide(championsLeague, cardSet, createRandom(SEED));
		const second = computerSide(championsLeague, cardSet, createRandom(SEED));

		expect(second).toEqual(first);
	});

	it('returns the refusal of a card set with no Icon', () => {
		const result = computerSide(
			divisionFour,
			aCheckedCardSet({ base: 60, rare: 12, legend: 6 }),
			createRandom(SEED)
		);

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards', tier: 'icon' });
	});

	it('refuses a card set with fewer than 11 different cards', () => {
		const result = computerSide(
			divisionFour,
			aCheckedCardSet({ base: 7, rare: 1, legend: 1, icon: 1 }),
			createRandom(SEED)
		);

		expect(result).toEqual({ ok: false, reason: 'not-eleven-different-cards' });
	});

	it('stops opening packs when the 11th card never comes', () => {
		const result = computerSide(divisionFour, aCheckedCardSet(ELEVEN), aRandomThatRolls([]));

		expect(result).toEqual({ ok: false, reason: 'not-eleven-different-cards' });
	});
});
