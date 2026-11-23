import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PAIRS_SIZES, dealPairs, settleTurn, turnCard } from './pairs.ts';
import { createRandom } from './random.ts';
import { aCheckedCardSet } from './testing/cards.ts';
import { aPlayerState } from './testing/state.ts';

const cardSet = aCheckedCardSet({ base: 14, rare: 0, legend: 0 });
const ownedIds = cardSet.slice(0, 12).map((entry) => entry.id);
const state = aPlayerState({ collection: Object.fromEntries(ownedIds.map((id) => [id, 3])) });
const size = fc.constantFrom(...PAIRS_SIZES);

const countById = (cards: readonly { readonly id: string }[]): Map<string, number> =>
	cards.reduce(
		(counts, entry) => counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1),
		new Map<string, number>()
	);

describe('dealing a Pairs board', () => {
	it('holds exactly two of each of size different owned cards', () => {
		fc.assert(
			fc.property(size, fc.integer(), (n, seed) => {
				const result = dealPairs(state, cardSet, n, createRandom(seed));
				expect(result.ok).toBe(true);
				if (!result.ok) {
					return;
				}
				const counts = countById(result.value.cards);
				expect(counts.size).toBe(n);
				expect([...counts.values()].every((count) => count === 2)).toBe(true);
				expect([...counts.keys()].every((id) => ownedIds.some((owned) => owned === id))).toBe(true);
			})
		);
	});
});

describe('playing a Pairs board', () => {
	it('never matches two different cards and never counts more turns than taps / 2', () => {
		fc.assert(
			fc.property(
				size,
				fc.integer(),
				fc.array(fc.tuple(fc.integer({ min: -1, max: 20 }), fc.boolean()), { maxLength: 80 }),
				(n, seed, taps) => {
					const dealt = dealPairs(state, cardSet, n, createRandom(seed));
					if (!dealt.ok) {
						throw new Error(dealt.reason);
					}
					const board = taps.reduce(
						(current, [index, settle]) =>
							settle ? settleTurn(turnCard(current, index)) : turnCard(current, index),
						dealt.value
					);
					const matched = board.cards.filter((entry) => entry.state === 'matched');
					expect([...countById(matched).values()].every((count) => count === 2)).toBe(true);
					expect(board.turns).toBeLessThanOrEqual(taps.length / 2);
				}
			)
		);
	});
});
