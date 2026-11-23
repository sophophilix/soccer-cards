import { describe, expect, it } from 'vitest';
import { DIVISIONS } from './divisions.ts';
import {
	ECONOMY_VERSION,
	JUMBO_PACK_COST_COINS,
	STANDARD_PACK_COST_COINS,
	STARTING_COINS,
	WIN_COINS_BY_DIVISION
} from './economy.ts';

describe('the economy table (ADR 0010 D1)', () => {
	it('is version 1', () => {
		expect(ECONOMY_VERSION).toBe(1);
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

	it('keeps each division reading its win coins from the table', () => {
		expect(DIVISIONS.map((division) => division.winCoins)).toEqual([4, 5, 6, 8, 10]);
	});
});
