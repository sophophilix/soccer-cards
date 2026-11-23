import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	MIN_TRAIL_SPELLS,
	TRAIL_ROUND_PLAYERS,
	createRandom,
	startTrailRound,
	trailOrder
} from './index.ts';
import type { Career } from './index.ts';

const seed = fc.integer();
const spell = fc.record({
	clubId: fc.constantFrom('red', 'green', 'blue', 'gold'),
	startYear: fc.integer({ min: 1990, max: 2030 })
});
const careers = fc.array(
	fc.record({
		playerId: fc.string({ minLength: 1, maxLength: 3 }),
		spells: fc.array(spell, { maxLength: 6 })
	}),
	{ maxLength: 12 }
);

describe('startTrailRound properties', () => {
	it('picks at most 5 different players who each have 3 or more spells', () => {
		fc.assert(
			fc.property(careers, seed, (list: Career[], roundSeed) => {
				const result = startTrailRound(list, createRandom(roundSeed));

				const ids = result.ok ? result.value.steps.map((step) => step.playerId) : [];
				expect(ids.length).toBeLessThanOrEqual(TRAIL_ROUND_PLAYERS);
				expect(new Set(ids).size).toBe(ids.length);
				for (const id of ids) {
					const matching = list.filter((item) => item.playerId === id);
					expect(matching).toHaveLength(1);
					expect(matching[0]?.spells.length).toBeGreaterThanOrEqual(MIN_TRAIL_SPELLS);
				}
			})
		);
	});

	it('deals each player’s own clubs, in the right order only when every order is right', () => {
		fc.assert(
			fc.property(careers, seed, (list: Career[], roundSeed) => {
				const result = startTrailRound(list, createRandom(roundSeed));

				for (const step of result.ok ? result.value.steps : []) {
					const right = trailOrder({ playerId: step.playerId, spells: step.spells }).map(
						(item) => item.clubId
					);
					expect([...step.dealt].sort()).toEqual([...right].sort());
					expect(step.dealt.join() === right.join()).toBe(new Set(right).size === 1);
				}
			})
		);
	});
});
