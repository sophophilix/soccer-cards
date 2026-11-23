import { describe, expect, it } from 'vitest';
import { checkTrail } from './index.ts';
import type { Career, Spell } from './index.ts';

const aSpell = (clubId: string, startYear: number, endYear?: number): Spell =>
	endYear === undefined ? { clubId, startYear } : { clubId, startYear, endYear };
const aCareer = (spells: readonly Spell[]): Career => ({ playerId: 'p1', spells });

describe('checkTrail', () => {
	const buffon = aCareer([
		aSpell('parma', 1995, 2001),
		aSpell('juve', 2001, 2018),
		aSpell('psg', 2018, 2019),
		aSpell('juve', 2019, 2021),
		aSpell('parma', 2021)
	]);

	it('says the right order is right in every place', () => {
		expect(checkTrail(buffon, ['parma', 'juve', 'psg', 'juve', 'parma'])).toEqual({
			ok: true,
			value: { isRight: true, places: [true, true, true, true, true] }
		});
	});

	it('says which places are wrong in a wrong order', () => {
		expect(checkTrail(buffon, ['juve', 'parma', 'psg', 'juve', 'parma'])).toEqual({
			ok: true,
			value: { isRight: false, places: [false, false, true, true, true] }
		});
	});

	it('treats two spells at the same club as the same answer in either order', () => {
		const career = aCareer([
			aSpell('juve', 2000, 2004),
			aSpell('juve', 2005, 2009),
			aSpell('psg', 2010)
		]);

		expect(checkTrail(career, ['juve', 'juve', 'psg'])).toEqual({
			ok: true,
			value: { isRight: true, places: [true, true, true] }
		});
	});

	it('uses the career order for two spells that start in the same year', () => {
		const career = aCareer([aSpell('a', 2000), aSpell('b', 2005), aSpell('c', 2005)]);

		expect(checkTrail(career, ['a', 'b', 'c'])).toMatchObject({ value: { isRight: true } });
		expect(checkTrail(career, ['a', 'c', 'b'])).toMatchObject({
			value: { isRight: false, places: [true, false, false] }
		});
	});

	it('checks by start year when the career lists spells out of order', () => {
		const career = aCareer([aSpell('b', 2005), aSpell('a', 2000), aSpell('c', 2010)]);

		expect(checkTrail(career, ['a', 'b', 'c'])).toMatchObject({ value: { isRight: true } });
	});

	it('refuses an answer with too few clubs', () => {
		expect(checkTrail(buffon, ['parma', 'juve'])).toEqual({ ok: false, reason: 'wrong-length' });
	});

	it('refuses an answer with too many clubs', () => {
		expect(checkTrail(buffon, ['parma', 'juve', 'psg', 'juve', 'parma', 'x'])).toEqual({
			ok: false,
			reason: 'wrong-length'
		});
	});

	it('refuses a club that is not in the career', () => {
		expect(checkTrail(buffon, ['parma', 'juve', 'psg', 'juve', 'nowhere'])).toEqual({
			ok: false,
			reason: 'unknown-club'
		});
	});

	it('refuses a club used more times than the career has it', () => {
		expect(checkTrail(buffon, ['parma', 'juve', 'psg', 'psg', 'parma'])).toEqual({
			ok: false,
			reason: 'club-used-too-often'
		});
	});
});
