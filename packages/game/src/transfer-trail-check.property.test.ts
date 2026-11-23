import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkTrail, createRandom, trailOrder } from './index.ts';

const seed = fc.integer();
const spell = fc.record({
	clubId: fc.constantFrom('red', 'green', 'blue', 'gold'),
	startYear: fc.integer({ min: 1990, max: 2030 })
});
const career = fc.record({
	playerId: fc.constant('p1'),
	spells: fc.array(spell, { minLength: 1, maxLength: 7 })
});

describe('checkTrail properties', () => {
	it('always checks the right order as right', () => {
		fc.assert(
			fc.property(career, (item) => {
				const right = trailOrder(item).map((s) => s.clubId);

				const result = checkTrail(item, right);

				expect(result.ok && result.value.isRight).toBe(true);
			})
		);
	});

	it('says an order is right exactly when every place matches by club', () => {
		fc.assert(
			fc.property(career, seed, (item, answerSeed) => {
				const right = trailOrder(item).map((s) => s.clubId);
				const answer = createRandom(answerSeed).sample(right, right.length);

				const result = checkTrail(item, answer);

				expect(result.ok && result.value.isRight).toBe(
					answer.every((club, i) => club === right[i])
				);
			})
		);
	});
});
