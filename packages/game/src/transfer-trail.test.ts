import { describe, expect, it } from 'vitest';
import { createRandom, startTrailRound, trailOrder } from './index.ts';
import type { Career, Spell } from './index.ts';

const SEED = 20261116;

const aSpell = (clubId: string, startYear: number, endYear?: number): Spell =>
	endYear === undefined ? { clubId, startYear } : { clubId, startYear, endYear };
const aCareer = (
	playerId: string,
	clubs: readonly string[] = ['red', 'green', 'blue']
): Career => ({
	playerId,
	spells: clubs.map((clubId, index) => aSpell(clubId, 2000 + index * 3))
});
const manyCareers = (count: number): Career[] =>
	Array.from({ length: count }, (_, index) => aCareer(`p${String(index)}`));
const idsOf = (careers: readonly Career[]): string[] => {
	const result = startTrailRound(careers, createRandom(SEED));
	return result.ok ? result.value.steps.map((step) => step.playerId) : [];
};

describe('startTrailRound', () => {
	it('picks 5 different players when more have 3 or more spells', () => {
		expect(new Set(idsOf(manyCareers(9))).size).toBe(5);
	});

	it('picks every eligible player when fewer than 5 have 3 or more spells', () => {
		const careers = [aCareer('a'), aCareer('b'), aCareer('short', ['red', 'blue'])];

		expect(idsOf(careers).sort()).toEqual(['a', 'b']);
	});

	it('refuses when no player has 3 or more spells', () => {
		const result = startTrailRound([aCareer('short', ['red', 'blue'])], createRandom(SEED));

		expect(result).toEqual({ ok: false, reason: 'no-eligible-players' });
	});

	it('refuses an empty list of careers', () => {
		expect(startTrailRound([], createRandom(SEED)).ok).toBe(false);
	});

	it('never picks a career with an empty spell list', () => {
		expect(idsOf([{ playerId: 'none', spells: [] }, aCareer('solo')])).toEqual(['solo']);
	});

	it('drops both careers that share a player id', () => {
		expect(idsOf([aCareer('twin'), aCareer('twin'), aCareer('solo')])).toEqual(['solo']);
	});

	it('picks a career whose last spell has no end year', () => {
		expect(idsOf([aCareer('now')])).toEqual(['now']);
	});

	it('deals clubs in an order that is not already right', () => {
		const result = startTrailRound(manyCareers(5), createRandom(SEED));

		const isRight = result.ok
			? result.value.steps.map((step) => step.dealt.join() === 'red,green,blue')
			: [];
		expect(isRight).toEqual([false, false, false, false, false]);
	});

	it('deals a trail that repeats clubs out of order', () => {
		const result = startTrailRound(
			[aCareer('buf', ['parma', 'juve', 'psg', 'juve', 'parma'])],
			createRandom(SEED)
		);

		expect(result.ok ? result.value.steps[0]?.dealt.join() : '').not.toBe(
			'parma,juve,psg,juve,parma'
		);
	});

	it('swaps two clubs when the random source keeps dealing the right order', () => {
		const stuck = { ...createRandom(SEED), sample: <T>(items: readonly T[]): T[] => [...items] };

		const result = startTrailRound([aCareer('a', ['red', 'red', 'blue'])], stuck);

		expect(result.ok ? result.value.steps[0]?.dealt : []).toEqual(['blue', 'red', 'red']);
	});

	it('deals the clubs it was given, nothing added or dropped', () => {
		const result = startTrailRound([aCareer('a', ['red', 'green', 'red'])], createRandom(SEED));

		expect([...(result.ok ? (result.value.steps[0]?.dealt ?? []) : [])].sort()).toEqual([
			'green',
			'red',
			'red'
		]);
	});

	it('deals one club in any order when every spell is at that club', () => {
		const result = startTrailRound([aCareer('one', ['red', 'red', 'red'])], createRandom(SEED));

		expect(result.ok ? result.value.steps[0]?.dealt : []).toEqual(['red', 'red', 'red']);
	});

	it('gives the same round for the same seed', () => {
		const careers = manyCareers(8);

		expect(startTrailRound(careers, createRandom(SEED))).toEqual(
			startTrailRound(careers, createRandom(SEED))
		);
	});
});

describe('trailOrder', () => {
	it('puts spells in the order their start years give', () => {
		const spells = [aSpell('c', 2010), aSpell('a', 2000), aSpell('b', 2005)];

		expect(trailOrder({ playerId: 'x', spells }).map((spell) => spell.clubId)).toEqual([
			'a',
			'b',
			'c'
		]);
	});

	it('keeps the career’s order for spells that start in the same year', () => {
		const spells = [aSpell('x', 2001), aSpell('y', 2001), aSpell('w', 2000)];

		expect(trailOrder({ playerId: 'p', spells }).map((spell) => spell.clubId)).toEqual([
			'w',
			'x',
			'y'
		]);
	});
});
