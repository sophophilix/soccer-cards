/** A source of repeatable random choices, passed in to every game rule that needs one. */
export interface Random {
	/** Returns a whole number from `min` to `max`, both included. */
	nextInt(min: number, max: number): number;
	/** Returns `count` different items from `items`, in a random order. */
	sample<T>(items: readonly T[], count: number): T[];
	/** Returns true with the given probability, from 0 (never) to 1 (always). */
	chance(probability: number): boolean;
}

const UINT32_RANGE = 2 ** 32;
// The constants of the mulberry32 generator.
const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_FIRST_OR = 1;
const MULBERRY_SECOND_OR = 61;

function requireWholeNumber(value: number, name: string): void {
	if (!Number.isSafeInteger(value)) {
		throw new RangeError(`${name} must be a whole number, got ${String(value)}`);
	}
}

/**
 * Creates a random number generator that gives the same sequence for the same seed.
 * Only the low 32 bits of the seed are used, so two seeds that differ by 2 ** 32 give
 * the same sequence.
 */
export function createRandom(seed: number): Random {
	requireWholeNumber(seed, 'seed');
	let state = seed >>> 0;

	const nextUint32 = (): number => {
		state = (state + MULBERRY_INCREMENT) >>> 0;
		let mixed = state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | MULBERRY_FIRST_OR);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | MULBERRY_SECOND_OR);
		return (mixed ^ (mixed >>> 14)) >>> 0;
	};

	const nextInt = (min: number, max: number): number => {
		requireWholeNumber(min, 'min');
		requireWholeNumber(max, 'max');
		const size = max - min + 1;
		if (size < 1 || size > UINT32_RANGE) {
			throw new RangeError(`no whole number range from ${String(min)} to ${String(max)}`);
		}
		// Draws past the last full multiple of `size` are thrown away, so
		// every value in the range is equally likely.
		const limit = UINT32_RANGE - (UINT32_RANGE % size);
		let drawn = nextUint32();
		while (drawn >= limit) {
			drawn = nextUint32();
		}
		return min + (drawn % size);
	};

	const sample = <T>(items: readonly T[], count: number): T[] => {
		requireWholeNumber(count, 'count');
		if (count < 0 || count > items.length) {
			throw new RangeError(
				`cannot sample ${String(count)} items from a list of ${String(items.length)}`
			);
		}
		const pool = [...items];
		return Array.from({ length: count }).flatMap(() => pool.splice(nextInt(0, pool.length - 1), 1));
	};

	const chance = (probability: number): boolean => {
		// The comparison is written so that NaN fails it too.
		if (!(probability >= 0 && probability <= 1)) {
			throw new RangeError(`probability must be from 0 to 1, got ${String(probability)}`);
		}
		// One draw whatever the probability, so a rule's later draws don't
		// depend on the odds it asked for.
		return nextUint32() / UINT32_RANGE < probability;
	};

	return { nextInt, sample, chance };
}
