import { describe, expect, it } from 'vitest';
import { toCardId } from './cards.ts';
import type { CardId } from './cards.ts';
import { PAIRS_SIZES, dealPairs, pairsSizesFor, settleTurn, turnCard } from './pairs.ts';
import type { PairsBoard, PairsSize } from './pairs.ts';
import { createRandom } from './random.ts';
import { aCheckedCardSet } from './testing/cards.ts';
import { aPlayerState } from './testing/state.ts';

const cardSet = aCheckedCardSet({ base: 12, rare: 0, legend: 0 });
const ids = (count: number): CardId[] =>
	Array.from({ length: count }, (_, i) => toCardId(`base-${String(i + 1)}`));
const owning = (count: number, copies = 1) =>
	aPlayerState({ collection: Object.fromEntries(ids(count).map((id) => [id, copies])) });

function deal(size: PairsSize, owned = 12): PairsBoard {
	const result = dealPairs(owning(owned), cardSet, size, createRandom(7));
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.value;
}

const indexesOf = (board: PairsBoard, id: CardId): number[] =>
	board.cards.flatMap((entry, i) => (entry.id === id ? [i] : []));

/** The indexes of the two cards of the first id, and of a card of another id. */
function pairAndOther(board: PairsBoard) {
	const first = board.cards[0]?.id ?? ids(1)[0] ?? toCardId('none');
	const same = indexesOf(board, first);
	const other = board.cards.findIndex((entry) => entry.id !== first);
	return { a: same[0] ?? -1, b: same[1] ?? -1, other };
}

describe('pairsSizesFor', () => {
	it('offers no size to a player with fewer than 6 different cards', () => {
		expect(pairsSizesFor(owning(5), cardSet)).toEqual([]);
	});

	it('offers 6 and 8 at exactly 8 different cards, and all three at 10', () => {
		expect(pairsSizesFor(owning(8), cardSet)).toEqual([6, 8]);
		expect(pairsSizesFor(owning(10), cardSet)).toEqual([...PAIRS_SIZES]);
	});
});

describe('dealPairs', () => {
	it('lays two face-down cards of each of size different owned cards', () => {
		const board = deal(8);

		expect(board.cards).toHaveLength(16);
		expect(board.cards.every((entry) => entry.state === 'down')).toBe(true);
		expect(new Set(board.cards.map((entry) => entry.id)).size).toBe(8);
		expect(board.turns).toBe(0);
		expect(board.isComplete).toBe(false);
	});

	it('gives one pair of a card the player owns many copies of', () => {
		const result = dealPairs(owning(6, 9), cardSet, 6, createRandom(3));

		expect(result.ok && new Set(result.value.cards.map((entry) => entry.id)).size).toBe(6);
	});

	it('refuses a size the player cannot play', () => {
		const result = dealPairs(owning(7), cardSet, 8, createRandom(1));

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards' });
	});
});

describe('turnCard', () => {
	it('turns the first card of a turn up and counts no turn yet', () => {
		const next = turnCard(deal(6), 0);

		expect(next.cards[0]?.state).toBe('up');
		expect(next.turns).toBe(0);
	});

	it('keeps a matching pair up as matched and counts the turn', () => {
		const board = deal(6);
		const { a, b } = pairAndOther(board);
		const next = turnCard(turnCard(board, a), b);

		expect([next.cards[a]?.state, next.cards[b]?.state]).toEqual(['matched', 'matched']);
		expect(next.turns).toBe(1);
		expect(next.mismatch).toBeNull();
	});

	it('marks two cards that differ to turn back, and ignores taps until settled', () => {
		const board = deal(6);
		const { a, other } = pairAndOther(board);
		const showing = turnCard(turnCard(board, a), other);
		const third = board.cards.findIndex((_, i) => i !== a && i !== other);

		expect(showing.mismatch).toEqual([a, other]);
		expect(showing.turns).toBe(1);
		expect(turnCard(showing, third)).toBe(showing);
	});

	it('turns a mismatch back down on settleTurn and allows the next turn', () => {
		const board = deal(6);
		const { a, other } = pairAndOther(board);
		const settled = settleTurn(turnCard(turnCard(board, a), other));

		expect(settled.cards.map((entry) => entry.state)).toEqual(board.cards.map(() => 'down'));
		expect(turnCard(settled, a).cards[a]?.state).toBe('up');
	});

	it('turns the same index once when it is tapped twice in a turn', () => {
		const once = turnCard(deal(6), 2);

		expect(turnCard(once, 2)).toBe(once);
	});

	it('ignores a matched card, and an index off the board', () => {
		const board = deal(6);
		const { a, b } = pairAndOther(board);
		const matched = turnCard(turnCard(board, a), b);

		expect(turnCard(matched, a)).toBe(matched);
		expect(turnCard(board, -1)).toBe(board);
		expect(turnCard(board, 99)).toBe(board);
	});

	it('says the board is complete when every pair is found', () => {
		const dealt = deal(6, 6);
		const board = ids(6).reduce((current, id) => {
			const [x, y] = indexesOf(current, id);
			return turnCard(turnCard(current, x ?? -1), y ?? -1);
		}, dealt);

		expect(board.isComplete).toBe(true);
		expect(board.turns).toBe(6);
	});
});
