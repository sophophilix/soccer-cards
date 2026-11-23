import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	MIN_TRAIL_SPELLS,
	TRAIL_ROUND_PLAYERS,
	checkTrail,
	checkTrailInRound,
	createRandom,
	finishTrailRound,
	startTrailRound,
	trailOrder
} from './index.ts';
import type { Career, Spell } from './index.ts';
import { aPlayerState } from './testing/state.ts';

const seed = fc.integer();
const clubs = fc.constantFrom('red', 'green', 'blue', 'gold');
const spell = fc.record({ clubId: clubs, startYear: fc.integer({ min: 1990, max: 2030 }) });
const spells = fc.array(spell, { minLength: 1, maxLength: 7 });
const career = fc.record({
	playerId: fc.string({ minLength: 1, maxLength: 3 }),
	spells: fc.array(spell, { maxLength: 6 })
});
const careers = fc.array(career, { maxLength: 12 });
const clubsOf = (list: readonly Spell[]): string[] => list.map((item) => item.clubId);

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

	it('deals each player’s own clubs and only an already-right order when every order is right', () => {
		fc.assert(
			fc.property(careers, seed, (list: Career[], roundSeed) => {
				const result = startTrailRound(list, createRandom(roundSeed));

				for (const step of result.ok ? result.value.steps : []) {
					const right = clubsOf(trailOrder(step.spells));
					expect([...step.dealt].sort()).toEqual([...right].sort());
					expect(step.dealt.join() === right.join()).toBe(new Set(right).size === 1);
				}
			})
		);
	});
});

describe('checkTrail properties', () => {
	it('always checks the right order as right', () => {
		fc.assert(
			fc.property(spells, (list) => {
				const result = checkTrail(list, clubsOf(trailOrder(list)));

				expect(result.ok && result.value.isRight).toBe(true);
			})
		);
	});

	it('says an order is right exactly when every place matches by club', () => {
		fc.assert(
			fc.property(spells, seed, (list, answerSeed) => {
				const right = clubsOf(trailOrder(list));
				const answer = createRandom(answerSeed).sample(right, right.length);

				const result = checkTrail(list, answer);

				expect(result.ok && result.value.isRight).toBe(
					answer.every((club, i) => club === right[i])
				);
			})
		);
	});
});

describe('a round’s payment', () => {
	it('never pays more than 7 coins however often a check or the finish repeats', () => {
		fc.assert(
			fc.property(
				careers,
				seed,
				fc.integer({ min: 1, max: 3 }),
				(list: Career[], roundSeed, repeats) => {
					const started = startTrailRound(list, createRandom(roundSeed));
					let round = started.ok ? started.value : { steps: [], checked: [], isFinished: false };
					let state = aPlayerState();
					for (let turn = 0; turn < repeats; turn++) {
						for (const step of round.steps) {
							const answer = clubsOf(trailOrder(step.spells));
							const checked = checkTrailInRound(round, state, step.playerId, answer);
							if (checked.ok) {
								({ round, state } = checked.value);
							}
						}
						const finished = finishTrailRound(round, state);
						if (finished.ok) {
							({ round, state } = finished.value);
						}
					}

					expect(state.coins).toBeLessThanOrEqual(7);
				}
			)
		);
	});
});
