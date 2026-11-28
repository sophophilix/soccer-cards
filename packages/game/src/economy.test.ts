import { describe, expect, it } from 'vitest';
import { DIVISIONS } from './divisions.ts';
import {
	CONNECTIONS_FINISH_COINS,
	CONNECTIONS_RIGHT_COINS,
	ECONOMY_VERSION,
	GUESS_FINISH_COINS,
	GUESS_RIGHT_COINS,
	JUMBO_PACK_COST_COINS,
	PAIRS_BOARD_COINS,
	PAIRS_FEW_TURNS_BONUS,
	STANDARD_PACK_COST_COINS,
	STARTING_COINS,
	TRAIL_FINISH_COINS,
	TRAIL_RIGHT_COINS,
	WIN_COINS_BY_DIVISION
} from './economy.ts';

describe('the economy table (ADR 0010 D1)', () => {
	it('is version 5', () => {
		expect(ECONOMY_VERSION).toBe(5);
	});

	it('starts a player with 0 coins', () => {
		expect(STARTING_COINS).toBe(0);
	});

	it('prices a standard pack at 5 coins', () => {
		expect(STANDARD_PACK_COST_COINS).toBe(5);
	});

	it('prices a jumbo pack at 20 coins', () => {
		expect(JUMBO_PACK_COST_COINS).toBe(20);
	});

	it('pays 4 coins for a win in division 4', () => {
		expect(WIN_COINS_BY_DIVISION['division-4']).toBe(4);
	});

	it('pays 5 coins for a win in division 3', () => {
		expect(WIN_COINS_BY_DIVISION['division-3']).toBe(5);
	});

	it('pays 6 coins for a win in division 2', () => {
		expect(WIN_COINS_BY_DIVISION['division-2']).toBe(6);
	});

	it('pays 8 coins for a win in division 1', () => {
		expect(WIN_COINS_BY_DIVISION['division-1']).toBe(8);
	});

	it('pays 10 coins for a win in the Champions League', () => {
		expect(WIN_COINS_BY_DIVISION['champions-league']).toBe(10);
	});

	it('pays 1 coin for each Transfer Trail put right on its first check', () => {
		expect(TRAIL_RIGHT_COINS).toBe(1);
	});

	it('pays 2 coins for finishing a Transfer Trail round', () => {
		expect(TRAIL_FINISH_COINS).toBe(2);
	});

	it('pays 1 coin for each Connections question answered right first', () => {
		expect(CONNECTIONS_RIGHT_COINS).toBe(1);
	});

	it('pays 2 coins for finishing a Connections round', () => {
		expect(CONNECTIONS_FINISH_COINS).toBe(2);
	});

	it('pays 1 coin for each Guess the Club question answered right first', () => {
		expect(GUESS_RIGHT_COINS).toBe(1);
	});

	it('pays 2 coins for finishing a Guess the Club round', () => {
		expect(GUESS_FINISH_COINS).toBe(2);
	});

	it('pays 3, 4 and 5 coins for a Pairs board of 6, 8 and 10 pairs', () => {
		expect(PAIRS_BOARD_COINS).toEqual({ 6: 3, 8: 4, 10: 5 });
	});

	it('pays 1 coin more for a Pairs board with few turns', () => {
		expect(PAIRS_FEW_TURNS_BONUS).toBe(1);
	});

	it('keeps each division reading its win coins from the table', () => {
		expect(DIVISIONS.map((division) => division.winCoins)).toEqual([4, 5, 6, 8, 10]);
	});
});
