import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRandom } from './index.ts';

const DRAWS = 20;
const bound = fc.integer({ min: -1_000_000, max: 1_000_000 });
const range = fc
	.tuple(bound, bound)
	.map(([a, b]) => ({ min: Math.min(a, b), max: Math.max(a, b) }));
const listAndCount = fc
	.uniqueArray(fc.integer(), { maxLength: 40 })
	.chain((items) => fc.record({ items: fc.constant(items), count: fc.nat(items.length) }));

const draw = (seed: number, min: number, max: number): number[] => {
	const random = createRandom(seed);
	return Array.from({ length: DRAWS }, () => random.nextInt(min, max));
};

describe('createRandom properties', () => {
	it('gives the same sequence for the same seed', () => {
		fc.assert(
			fc.property(fc.integer(), range, (seed, { min, max }) => {
				expect(draw(seed, min, max)).toEqual(draw(seed, min, max));
			})
		);
	});

	it('keeps a whole number inside its range', () => {
		fc.assert(
			fc.property(fc.integer(), range, (seed, { min, max }) => {
				const values = draw(seed, min, max);

				expect(values.every((value) => Number.isInteger(value))).toBe(true);
				expect(Math.min(...values)).toBeGreaterThanOrEqual(min);
				expect(Math.max(...values)).toBeLessThanOrEqual(max);
			})
		);
	});

	it('samples without repeats and only from the list', () => {
		fc.assert(
			fc.property(fc.integer(), listAndCount, (seed, { items, count }) => {
				const sample = createRandom(seed).sample(items, count);

				expect(sample).toHaveLength(count);
				expect(new Set(sample).size).toBe(count);
				expect(sample.every((item) => items.includes(item))).toBe(true);
			})
		);
	});
});

describe('chance properties', () => {
	const ROLLS = 4000;
	const TOLERANCE = 0.05;
	const roll = (seed: number, probability: number): boolean[] => {
		const random = createRandom(seed);
		return Array.from({ length: ROLLS }, () => random.chance(probability));
	};

	it('is true about the given share of the time', () => {
		fc.assert(
			fc.property(fc.integer(), fc.constantFrom(0.1, 0.5, 0.9), (seed, probability) => {
				const share = roll(seed, probability).filter(Boolean).length / ROLLS;

				expect(Math.abs(share - probability)).toBeLessThan(TOLERANCE);
			})
		);
	});

	it('gives the same answers for the same seed', () => {
		fc.assert(
			fc.property(fc.integer(), fc.double({ min: 0, max: 1, noNaN: true }), (seed, probability) => {
				expect(roll(seed, probability)).toEqual(roll(seed, probability));
			})
		);
	});
});
