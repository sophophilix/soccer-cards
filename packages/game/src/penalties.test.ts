import { describe, expect, it } from 'vitest';
import { saveChance, startShootOut, takeKick } from './index.ts';
import type { Random, ShootOut } from './index.ts';

// Answers each corner draw from `others` (0 left, 1 middle, 2 right) and each roll from
// `rolls`, then right and false, and notes each call it was asked.
const stubRandom = (others: number[], rolls: boolean[] = [], asked: unknown[] = []): Random => ({
	nextInt: (min, max) => {
		asked.push([min, max]);
		return others.shift() ?? 2;
	},
	sample: (items, count) => items.slice(0, count),
	chance: (probability) => {
		asked.push(probability);
		return rolls.shift() ?? false;
	}
});

// Takes each kick in order with one random source, and fails on any refused kick.
const kicks = (from: ShootOut, corners: readonly string[], random: Random): ShootOut =>
	corners.reduce((shootOut, corner) => {
		const result = takeKick(shootOut, corner, random);
		if (!result.ok) {
			throw new RangeError(`kick refused: ${result.reason}`);
		}
		return result.value;
	}, from);

const level = startShootOut({ player: 80, opponent: 80 });
// With the stub's default of right, a kick to the left is never saved.
const left = (count: number): string[] => Array.from({ length: count }, () => 'left');
// Every kick of the player scores and every kick of the other side misses.
const threeNil = kicks(level, left(6), stubRandom([], [false, true, false, true, false, true]));

describe('takeKick', () => {
	it('lets the player kick first, then the other side, and names both corners', () => {
		const shootOut = kicks(level, ['left', 'right'], stubRandom([1, 0]));

		expect([level.status, shootOut.kicks]).toEqual([
			{ kind: 'kicking', next: 'player' },
			[
				{ kicker: 'player', shot: 'left', dive: 'middle', outcome: 'goal' },
				{ kicker: 'opponent', shot: 'left', dive: 'right', outcome: 'goal' }
			]
		]);
	});

	it('draws the other corner from the three, then a save only when the corners match', () => {
		const asked: unknown[] = [];

		kicks(level, ['left', 'middle'], stubRandom([2, 1], [], asked));

		expect(asked).toEqual([[0, 2], 0.05, [0, 2], 0.6, 0.05]);
	});

	it.each([
		[[true], 'save', 0],
		[[false, true], 'miss', 0],
		[[false, false], 'goal', 1]
	])('rolls %j into a %s', (rolls, outcome, goals) => {
		const shootOut = kicks(level, ['middle'], stubRandom([1], rolls));

		expect([shootOut.kicks[0]?.outcome, shootOut.score.player]).toEqual([outcome, goals]);
	});

	it("saves by the defending side's goalkeeper", () => {
		const asked: unknown[] = [];

		kicks(startShootOut({ player: 70, opponent: 95 }), left(2), stubRandom([0, 0], [], asked));

		expect([asked[1], asked[4]]).toEqual([saveChance(95), saveChance(70)]);
	});

	it.each([
		[80, 0.6],
		[90, 0.7],
		[60, 0.4],
		[110, 0.9],
		[40, 0.3]
	])('gives a keeper of strength %d a save chance of %d', (keeper, chance) => {
		expect(saveChance(keeper)).toBeCloseTo(chance, 10);
	});

	it('is over at 3-0 after three kicks each', () => {
		expect([threeNil.score, threeNil.status]).toEqual([
			{ player: 3, opponent: 0 },
			{ kind: 'over', winner: 'player' }
		]);
	});

	it('goes on past five each one pair at a time until a pair leaves one side ahead', () => {
		const sixthKick = kicks(level, left(11), stubRandom([]));
		const sixthPair = kicks(sixthKick, ['left'], stubRandom([]));
		const after = kicks(sixthPair, ['right', 'left'], stubRandom([1, 0], [false, true]));

		expect([sixthKick.status, sixthPair.status, after.score, after.status]).toEqual([
			{ kind: 'kicking', next: 'opponent' },
			{ kind: 'kicking', next: 'player' },
			{ player: 7, opponent: 6 },
			{ kind: 'over', winner: 'player' }
		]);
	});

	it('refuses a kick after the shoot-out is over', () => {
		expect(takeKick(threeNil, 'left', stubRandom([]))).toEqual({
			ok: false,
			reason: 'shoot-out-over'
		});
	});

	it('refuses a corner that is not one of the three', () => {
		expect(takeKick(level, 'top', stubRandom([]))).toEqual({ ok: false, reason: 'not-a-corner' });
	});
});
