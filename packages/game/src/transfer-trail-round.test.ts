import { describe, expect, it } from 'vitest';
import { createPlayerState } from './index.ts';
import { checkTrailInRound, finishTrailRound, openPaidRound } from './transfer-trail-round.ts';
import type { PaidTrailRound } from './transfer-trail-round.ts';
import type { TrailRound, TrailStep } from './transfer-trail.ts';

const aStep = (playerId: string): TrailStep => ({
	playerId,
	spells: [
		{ clubId: 'red', startYear: 2000 },
		{ clubId: 'green', startYear: 2004 },
		{ clubId: 'blue', startYear: 2008 }
	],
	dealt: ['blue', 'red', 'green']
});
const aRound = (count: number): TrailRound => ({
	steps: Array.from({ length: count }, (_, i) => aStep(`p${String(i + 1)}`))
});
const RIGHT = ['red', 'green', 'blue'];
const WRONG = ['green', 'red', 'blue'];
const stateWith = (coins: number) => ({ ...createPlayerState(), coins });

function check(paid: PaidTrailRound, coins: number, playerId: string, answer: string[]) {
	const result = checkTrailInRound(paid, stateWith(coins), playerId, answer);
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.value;
}

function checkAll(count: number, answer: string[]) {
	let paid = openPaidRound(aRound(count));
	let coins = 0;
	for (let i = 1; i <= count; i++) {
		const value = check(paid, coins, `p${String(i)}`, answer);
		paid = value.paid;
		coins = value.state.coins;
	}
	return { paid, state: stateWith(coins) };
}

describe('checkTrailInRound', () => {
	it('pays 1 coin for a right trail on its first check', () => {
		const value = check(openPaidRound(aRound(2)), 3, 'p1', RIGHT);

		expect(value.state.coins).toBe(4);
		expect(value.check.isRight).toBe(true);
		expect(value.paid.checked).toEqual(['p1']);
	});

	it('pays nothing for a wrong trail and takes nothing away', () => {
		const value = check(openPaidRound(aRound(2)), 3, 'p1', WRONG);

		expect(value.state.coins).toBe(3);
		expect(value.check.isRight).toBe(false);
	});

	it('pays nothing for a trail put right after a wrong first check', () => {
		const first = check(openPaidRound(aRound(2)), 0, 'p1', WRONG);
		const second = check(first.paid, first.state.coins, 'p1', RIGHT);

		expect(second.state.coins).toBe(0);
		expect(second.check.isRight).toBe(true);
	});

	it('pays a right trail once however often it is checked', () => {
		const first = check(openPaidRound(aRound(2)), 0, 'p1', RIGHT);
		const again = check(first.paid, first.state.coins, 'p1', RIGHT);

		expect(again.state.coins).toBe(1);
		expect(again.paid).toBe(first.paid);
	});

	it('refuses a player that is not in the round', () => {
		const result = checkTrailInRound(openPaidRound(aRound(2)), stateWith(0), 'nobody', RIGHT);

		expect(result).toEqual({ ok: false, reason: 'unknown-player' });
	});

	it('passes on a refusal from checking the trail', () => {
		const result = checkTrailInRound(openPaidRound(aRound(2)), stateWith(0), 'p1', ['red']);

		expect(result).toEqual({ ok: false, reason: 'wrong-length' });
	});

	it('never changes the state or round it was given', () => {
		const paid = openPaidRound(aRound(2));
		const state = stateWith(3);

		checkTrailInRound(paid, state, 'p1', RIGHT);

		expect(state.coins).toBe(3);
		expect(paid.checked).toEqual([]);
	});
});

describe('finishTrailRound', () => {
	it('refuses before every trail has had its first check', () => {
		const first = check(openPaidRound(aRound(2)), 0, 'p1', RIGHT);

		expect(finishTrailRound(first.paid, first.state)).toEqual({
			ok: false,
			reason: 'trails-unchecked'
		});
	});

	it('pays 2 coins once every trail has had its first check, wrong or right', () => {
		const one = check(openPaidRound(aRound(2)), 0, 'p1', RIGHT);
		const two = check(one.paid, one.state.coins, 'p2', WRONG);

		const result = finishTrailRound(two.paid, two.state);

		expect(result.ok && result.value.state.coins).toBe(3);
		expect(result.ok && result.value.paid.isFinished).toBe(true);
	});

	it('pays for finishing once however often it is repeated', () => {
		const { paid, state } = checkAll(1, RIGHT);
		const done = finishTrailRound(paid, state);
		if (!done.ok) {
			throw new Error(done.reason);
		}

		const again = finishTrailRound(done.value.paid, done.value.state);

		expect(again.ok && again.value.state.coins).toBe(3);
	});

	it('pays 5 + 2 coins for a full round of right trails', () => {
		const { paid, state } = checkAll(5, RIGHT);

		const done = finishTrailRound(paid, state);

		expect(done.ok && done.value.state.coins).toBe(7);
	});

	it('pays 1 per right trail plus 2 for a round of fewer than 5 players', () => {
		const { paid, state } = checkAll(3, RIGHT);

		const done = finishTrailRound(paid, state);

		expect(done.ok && done.value.state.coins).toBe(5);
	});
});
