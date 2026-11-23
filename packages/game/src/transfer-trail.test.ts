import { describe, expect, it } from 'vitest';
import {
	TRAIL_FINISH_COINS,
	TRAIL_RIGHT_COINS,
	checkTrail,
	checkTrailInRound,
	createRandom,
	finishTrailRound,
	startTrailRound,
	trailOrder
} from './index.ts';
import type { Career, PlayerState, Spell, TrailRound } from './index.ts';
import { aPlayerState } from './testing/state.ts';

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
const roundOf = (count: number): TrailRound => {
	const started = startTrailRound(manyCareers(count), createRandom(SEED));
	if (!started.ok) {
		throw new Error('the test round did not start');
	}
	return started.value;
};
const rightAnswer = (round: TrailRound, playerId: string): string[] =>
	trailOrder(round.steps.find((step) => step.playerId === playerId)?.spells ?? []).map(
		(spell) => spell.clubId
	);
const checkedAll = (round: TrailRound, state: PlayerState, right: boolean): TrailRound => {
	let current = round;
	for (const step of round.steps) {
		const answer = right ? rightAnswer(round, step.playerId) : [...step.dealt];
		const result = checkTrailInRound(current, state, step.playerId, answer);
		current = result.ok ? result.value.round : current;
	}
	return current;
};

describe('startTrailRound', () => {
	it('picks 5 different players when more have 3 or more spells', () => {
		const result = startTrailRound(manyCareers(9), createRandom(SEED));

		const ids = result.ok ? result.value.steps.map((step) => step.playerId) : [];
		expect(new Set(ids).size).toBe(5);
	});

	it('picks every eligible player when fewer than 5 have 3 or more spells', () => {
		const careers = [aCareer('a'), aCareer('b'), aCareer('short', ['red', 'blue'])];

		const result = startTrailRound(careers, createRandom(SEED));

		expect(result.ok ? result.value.steps.map((step) => step.playerId).sort() : []).toEqual([
			'a',
			'b'
		]);
	});

	it('refuses when no player has 3 or more spells', () => {
		const result = startTrailRound([aCareer('short', ['red', 'blue'])], createRandom(SEED));

		expect(result).toEqual({ ok: false, reason: 'no-eligible-players' });
	});

	it('refuses an empty list of careers', () => {
		expect(startTrailRound([], createRandom(SEED))).toEqual({
			ok: false,
			reason: 'no-eligible-players'
		});
	});

	it('refuses a career with an empty spell list', () => {
		const result = startTrailRound([{ playerId: 'none', spells: [] }], createRandom(SEED));

		expect(result.ok).toBe(false);
	});

	it('never picks a player id that appears twice', () => {
		const result = startTrailRound(
			[aCareer('twin'), aCareer('twin'), aCareer('solo')],
			createRandom(SEED)
		);

		expect(result.ok ? result.value.steps.map((step) => step.playerId) : []).toEqual(['solo']);
	});

	it('deals clubs in an order that is not already right', () => {
		const result = startTrailRound(manyCareers(5), createRandom(SEED));

		const isRight = result.ok
			? result.value.steps.map(
					(step) => step.dealt.join() === rightAnswer(result.value, step.playerId).join()
				)
			: [];
		expect(isRight).toEqual([false, false, false, false, false]);
	});

	it('deals a career of two clubs that alternate out of order', () => {
		const alternating = aCareer('buf', ['parma', 'juve', 'psg', 'juve', 'parma']);

		const result = startTrailRound([alternating], createRandom(SEED));

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

		expect(result.ok ? [...(result.value.steps[0]?.dealt ?? [])].sort() : []).toEqual([
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

		expect(trailOrder(spells).map((spell) => spell.clubId)).toEqual(['a', 'b', 'c']);
	});

	it('keeps the career’s order for spells that start in the same year', () => {
		const spells = [aSpell('x', 2001), aSpell('y', 2001), aSpell('w', 2000)];

		expect(trailOrder(spells).map((spell) => spell.clubId)).toEqual(['w', 'x', 'y']);
	});
});

describe('checkTrail', () => {
	const spells = [
		aSpell('parma', 1995, 2001),
		aSpell('juve', 2001, 2018),
		aSpell('psg', 2018, 2019),
		aSpell('juve', 2019, 2021),
		aSpell('parma', 2021)
	];

	it('says the right order is right in every place', () => {
		const result = checkTrail(spells, ['parma', 'juve', 'psg', 'juve', 'parma']);

		expect(result).toEqual({
			ok: true,
			value: { isRight: true, places: [true, true, true, true, true] }
		});
	});

	it('says which places are wrong in a wrong order', () => {
		const result = checkTrail(spells, ['juve', 'parma', 'psg', 'juve', 'parma']);

		expect(result).toEqual({
			ok: true,
			value: { isRight: false, places: [false, false, true, true, true] }
		});
	});

	it('treats two spells at the same club as the same answer in either order', () => {
		const result = checkTrail(
			[aSpell('juve', 2000, 2004), aSpell('juve', 2005, 2009), aSpell('psg', 2010)],
			['juve', 'juve', 'psg']
		);

		expect(result.ok && result.value.isRight).toBe(true);
	});

	it('does not read a missing end year as a problem', () => {
		expect(
			checkTrail([aSpell('a', 2000), aSpell('b', 2001, 2005), aSpell('c', 2006)], ['a', 'b', 'c'])
				.ok
		).toBe(true);
	});

	it('refuses an answer with too few clubs', () => {
		expect(checkTrail(spells, ['parma', 'juve'])).toEqual({ ok: false, reason: 'wrong-length' });
	});

	it('refuses an answer with too many clubs', () => {
		expect(checkTrail(spells, ['parma', 'juve', 'psg', 'juve', 'parma', 'x'])).toEqual({
			ok: false,
			reason: 'wrong-length'
		});
	});

	it('refuses a club that is not in the career', () => {
		expect(checkTrail(spells, ['parma', 'juve', 'psg', 'juve', 'nowhere'])).toEqual({
			ok: false,
			reason: 'unknown-club'
		});
	});

	it('checks by start year even when the career lists spells out of order', () => {
		const result = checkTrail(
			[aSpell('b', 2005), aSpell('a', 2000), aSpell('c', 2010)],
			['a', 'b', 'c']
		);

		expect(result.ok && result.value.isRight).toBe(true);
	});
});

describe('checkTrailInRound', () => {
	it('pays 1 coin for a trail right on its first check', () => {
		const round = roundOf(5);
		const id = round.steps[0]?.playerId ?? '';

		const result = checkTrailInRound(round, aPlayerState({ coins: 3 }), id, rightAnswer(round, id));

		expect(result.ok ? result.value.state.coins : -1).toBe(3 + TRAIL_RIGHT_COINS);
	});

	it('takes nothing away for a wrong trail', () => {
		const round = roundOf(5);
		const step = round.steps[0];

		const result = checkTrailInRound(round, aPlayerState({ coins: 3 }), step?.playerId ?? '', [
			...(step?.dealt ?? [])
		]);

		expect(result.ok ? result.value.state.coins : -1).toBe(3);
	});

	it('pays nothing for a second check of the same trail', () => {
		const round = roundOf(5);
		const id = round.steps[0]?.playerId ?? '';
		const first = checkTrailInRound(round, aPlayerState(), id, rightAnswer(round, id));
		if (!first.ok) {
			throw new Error('the first check was refused');
		}

		const again = checkTrailInRound(
			first.value.round,
			first.value.state,
			id,
			rightAnswer(round, id)
		);

		expect(again.ok ? again.value.state.coins : -1).toBe(TRAIL_RIGHT_COINS);
	});

	it('pays nothing when a trail is put right after a wrong first check', () => {
		const round = roundOf(5);
		const step = round.steps[0];
		const id = step?.playerId ?? '';
		const first = checkTrailInRound(round, aPlayerState(), id, [...(step?.dealt ?? [])]);
		if (!first.ok) {
			throw new Error('the first check was refused');
		}

		const again = checkTrailInRound(
			first.value.round,
			first.value.state,
			id,
			rightAnswer(round, id)
		);

		expect(again.ok ? again.value.state.coins : -1).toBe(0);
	});

	it('returns a new state and leaves the old one as it was', () => {
		const round = roundOf(5);
		const id = round.steps[0]?.playerId ?? '';
		const before = aPlayerState({ coins: 1 });

		checkTrailInRound(round, before, id, rightAnswer(round, id));

		expect(before.coins).toBe(1);
	});

	it('refuses an answer of the wrong length and changes nothing', () => {
		const round = roundOf(5);

		const result = checkTrailInRound(round, aPlayerState(), round.steps[0]?.playerId ?? '', [
			'red'
		]);

		expect(result).toEqual({ ok: false, reason: 'wrong-length' });
	});

	it('refuses a club that is not in the career', () => {
		const round = roundOf(5);

		const result = checkTrailInRound(round, aPlayerState(), round.steps[0]?.playerId ?? '', [
			'red',
			'green',
			'nowhere'
		]);

		expect(result).toEqual({ ok: false, reason: 'unknown-club' });
	});

	it('refuses a player who is not in the round', () => {
		const result = checkTrailInRound(roundOf(5), aPlayerState(), 'stranger', [
			'red',
			'green',
			'blue'
		]);

		expect(result).toEqual({ ok: false, reason: 'unknown-player' });
	});
});

describe('finishTrailRound', () => {
	it('pays 2 coins for finishing once every trail is checked', () => {
		const round = checkedAll(roundOf(5), aPlayerState(), false);

		const result = finishTrailRound(round, aPlayerState({ coins: 4 }));

		expect(result.ok ? result.value.state.coins : -1).toBe(4 + TRAIL_FINISH_COINS);
	});

	it('pays nothing the second time the round is finished', () => {
		const round = checkedAll(roundOf(5), aPlayerState(), false);
		const first = finishTrailRound(round, aPlayerState());
		if (!first.ok) {
			throw new Error('finishing was refused');
		}

		const again = finishTrailRound(first.value.round, first.value.state);

		expect(again.ok ? again.value.state.coins : -1).toBe(TRAIL_FINISH_COINS);
	});

	it('refuses to finish while a trail is unchecked', () => {
		expect(finishTrailRound(roundOf(5), aPlayerState())).toEqual({
			ok: false,
			reason: 'trails-unchecked'
		});
	});

	it('pays 7 coins at most for a round with every trail right', () => {
		let state = aPlayerState();
		let round = roundOf(5);
		for (const step of round.steps) {
			const result = checkTrailInRound(
				round,
				state,
				step.playerId,
				rightAnswer(round, step.playerId)
			);
			if (result.ok) {
				({ round, state } = result.value);
			}
		}

		const finished = finishTrailRound(round, state);

		expect(finished.ok ? finished.value.state.coins : -1).toBe(7);
	});
});
