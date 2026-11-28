import { describe, expect, it } from 'vitest';
import { createPlayerState, payPairsBoard } from './index.ts';
import type { PairsBoard, PairsSize } from './index.ts';

const aFinishedBoard = (size: PairsSize, turns: number): PairsBoard => ({
	size,
	cards: [],
	turns,
	mismatch: null,
	firstIndex: null,
	isComplete: true
});
const stateWith = (coins: number) => ({ ...createPlayerState(), coins });

function pay(board: PairsBoard, coins: number) {
	const result = payPairsBoard(board, stateWith(coins));
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.value;
}

describe('payPairsBoard', () => {
	it('pays 3 coins for 6 pairs in many turns', () => {
		expect(pay(aFinishedBoard(6, 13), 2).state.coins).toBe(5);
	});

	it('pays 4 coins for 8 pairs in many turns', () => {
		expect(pay(aFinishedBoard(8, 17), 2).state.coins).toBe(6);
	});

	it('pays 5 coins for 10 pairs in many turns', () => {
		expect(pay(aFinishedBoard(10, 21), 2).state.coins).toBe(7);
	});

	it('adds 1 coin for exactly twice as many turns as pairs', () => {
		expect(pay(aFinishedBoard(6, 12), 0).state.coins).toBe(4);
	});

	it('adds 1 coin for fewer turns than twice the pairs', () => {
		expect(pay(aFinishedBoard(10, 10), 0).state.coins).toBe(6);
	});

	it('adds no bonus for one turn more than twice the pairs', () => {
		expect(pay(aFinishedBoard(8, 17), 0).state.coins).toBe(4);
	});

	it('records the board as paid', () => {
		expect(pay(aFinishedBoard(6, 6), 0).board.isPaid).toBe(true);
	});

	it('pays nothing the second time', () => {
		const first = pay(aFinishedBoard(6, 6), 0);
		const second = payPairsBoard(first.board, first.state);

		expect(second).toEqual({ ok: true, value: first });
	});

	it('refuses a board that is not finished', () => {
		const board = { ...aFinishedBoard(6, 3), isComplete: false };

		expect(payPairsBoard(board, stateWith(0))).toEqual({ ok: false, reason: 'board-unfinished' });
	});

	it('never changes the old state or board', () => {
		const board = aFinishedBoard(6, 6);
		const state = stateWith(1);

		payPairsBoard(board, state);

		expect(state.coins).toBe(1);
		expect(board).not.toHaveProperty('isPaid');
	});
});
