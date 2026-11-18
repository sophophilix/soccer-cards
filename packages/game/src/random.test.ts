import { describe, expect, it, vi } from 'vitest';
import { createRandom } from './index.ts';

const drawTen = (seed: number): number[] => {
	const random = createRandom(seed);
	return Array.from({ length: 10 }, () => random.nextInt(0, 1_000_000));
};

describe('createRandom', () => {
	it('gives the same sequence for the same seed', () => {
		expect(drawTen(42)).toEqual(drawTen(42));
	});

	it('gives a different sequence for a different seed', () => {
		expect(drawTen(42)).not.toEqual(drawTen(43));
	});

	it('gives a varied, repeatable sequence for a seed of 0', () => {
		expect(new Set(drawTen(0)).size).toBeGreaterThan(1);
		expect(drawTen(0)).toEqual(drawTen(0));
	});

	it('gives a varied, repeatable sequence for a negative seed', () => {
		expect(new Set(drawTen(-7)).size).toBeGreaterThan(1);
		expect(drawTen(-7)).toEqual(drawTen(-7));
		expect(drawTen(-7)).not.toEqual(drawTen(7));
	});

	it('refuses a seed that is not a whole number', () => {
		expect(() => createRandom(1.5)).toThrow(RangeError);
		expect(() => createRandom(Number.NaN)).toThrow(RangeError);
	});

	it('never calls Math.random or reads the clock', () => {
		const mathRandom = vi.spyOn(Math, 'random');
		const dateNow = vi.spyOn(Date, 'now');

		const random = createRandom(1);
		random.nextInt(1, 6);
		random.sample(['a', 'b', 'c'], 2);

		expect(mathRandom).not.toHaveBeenCalled();
		expect(dateNow).not.toHaveBeenCalled();
		vi.restoreAllMocks();
	});
});

describe('nextInt', () => {
	it('returns the only value of a range of one value', () => {
		expect(createRandom(3).nextInt(5, 5)).toBe(5);
	});

	it('reaches both ends of a small range', () => {
		const random = createRandom(9);
		const seen = new Set(Array.from({ length: 200 }, () => random.nextInt(-1, 1)));

		expect([...seen].sort((a, b) => a - b)).toEqual([-1, 0, 1]);
	});

	it('stays in a range just over half as wide as the generator', () => {
		const random = createRandom(5);
		const values = Array.from({ length: 50 }, () => random.nextInt(0, 2 ** 31));

		expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...values)).toBeLessThanOrEqual(2 ** 31);
	});

	it('refuses a range whose start is after its end', () => {
		expect(() => createRandom(1).nextInt(2, 1)).toThrow(RangeError);
	});

	it('refuses a bound that is not a whole number', () => {
		expect(() => createRandom(1).nextInt(0.5, 2)).toThrow(RangeError);
		expect(() => createRandom(1).nextInt(0, 2.5)).toThrow(RangeError);
	});

	it('refuses a range wider than the generator can cover evenly', () => {
		expect(() => createRandom(1).nextInt(0, 2 ** 32)).toThrow(RangeError);
	});
});

describe('sample', () => {
	const items = ['a', 'b', 'c', 'd', 'e'] as const;

	it('returns an empty list for a sample of 0 items', () => {
		expect(createRandom(1).sample(items, 0)).toEqual([]);
	});

	it('returns every item once for a sample of the whole list', () => {
		expect(createRandom(1).sample(items, items.length).sort()).toEqual([...items]);
	});

	it('returns the asked number of different items', () => {
		const sample = createRandom(1).sample(items, 3);

		expect(sample).toHaveLength(3);
		expect(new Set(sample).size).toBe(3);
	});

	it('gives the same sample for the same seed', () => {
		expect(createRandom(11).sample(items, 3)).toEqual(createRandom(11).sample(items, 3));
	});

	it('throws when asked for more items than the list has', () => {
		expect(() => createRandom(1).sample(items, items.length + 1)).toThrow(RangeError);
	});

	it('throws when asked for one item from an empty list', () => {
		expect(() => createRandom(1).sample([], 1)).toThrow(RangeError);
	});

	it('refuses a count that is negative or not a whole number', () => {
		expect(() => createRandom(1).sample(items, -1)).toThrow(RangeError);
		expect(() => createRandom(1).sample(items, 1.5)).toThrow(RangeError);
	});

	it('leaves the list it was given unchanged', () => {
		const list = ['a', 'b', 'c', 'd', 'e'];

		createRandom(1).sample(list, 5);

		expect(list).toEqual(['a', 'b', 'c', 'd', 'e']);
	});
});

describe('chance', () => {
	const UINT32_MAX = 2 ** 32 - 1;
	const answers = (seed: number, probability: number): boolean[] => {
		const random = createRandom(seed);
		return Array.from({ length: 200 }, () => random.chance(probability));
	};
	const rawAfterChance = (probability: number): number => {
		const random = createRandom(21);
		random.chance(probability);
		return random.nextInt(0, UINT32_MAX);
	};
	const secondRaw = (): number => {
		const random = createRandom(21);
		random.nextInt(0, UINT32_MAX);
		return random.nextInt(0, UINT32_MAX);
	};

	it('is never true for a probability of 0', () => {
		expect(answers(4, 0)).not.toContain(true);
	});

	it('is always true for a probability of 1', () => {
		expect(answers(4, 1)).not.toContain(false);
	});

	it('gives both answers for a probability of 0.5', () => {
		expect(new Set(answers(4, 0.5)).size).toBe(2);
	});

	it('is not true in 200 rolls for a very small probability', () => {
		expect(answers(4, 1e-9)).not.toContain(true);
	});

	it.each([Number.NaN, -0.1, 1.1])('refuses a probability of %s and names it', (probability) => {
		const random = createRandom(1);

		expect(() => random.chance(probability)).toThrow(RangeError);
		expect(() => random.chance(probability)).toThrow(String(probability));
	});

	it('gives the same answers for the same seed', () => {
		expect(answers(42, 0.5)).toEqual(answers(42, 0.5));
	});

	it.each([0, 1e-9, 0.5, 1])('moves the sequence on by one step for %s', (probability) => {
		expect(rawAfterChance(probability)).toBe(secondRaw());
	});

	it('leaves the nextInt and sample sequences as they were', () => {
		expect(drawTen(42).slice(0, 3)).toEqual([718375, 391365, 309043]);
		expect(createRandom(11).sample(['a', 'b', 'c', 'd', 'e'], 3)).toEqual(['d', 'a', 'c']);
	});
});
