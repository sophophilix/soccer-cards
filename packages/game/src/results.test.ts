import { describe, expect, it } from 'vitest';
import {
	DIVISIONS,
	STATE_VERSION,
	WINS_TO_GO_UP,
	canPlayMatch,
	createPlayerState,
	recordLoss,
	recordWin,
	toCardId
} from './index.ts';
import type { CardId } from './index.ts';
import { aPlayerState } from './testing/state.ts';

const [divisionFour, divisionThree, , divisionOne, championsLeague] = DIVISIONS;

/** A collection of `different` cards, holding `copies` copies in all, spread as evenly as they go. */
function aCollection(different: number, copies: number): Record<CardId, number> {
	return Object.fromEntries(
		Array.from({ length: different }, (_, index) => [
			toCardId(`card-${String(index + 1)}`),
			Math.floor(copies / different) + (index < copies % different ? 1 : 0)
		])
	);
}

describe('a new player', () => {
	it('starts in Division 4 with no wins and no losses', () => {
		expect(createPlayerState()).toMatchObject({
			division: 'division-4',
			divisionWins: 0,
			wins: 0,
			losses: 0
		});
	});

	it('has state version 2', () => {
		expect([STATE_VERSION, createPlayerState().version]).toEqual([2, 2]);
	});

	it('names 3 wins to go up a division', () => {
		expect(WINS_TO_GO_UP).toBe(3);
	});
});

describe('canPlayMatch', () => {
	it('lets a player with 11 different cards play', () => {
		expect(canPlayMatch(aPlayerState({ collection: aCollection(11, 11) }))).toBe(true);
	});

	it('lets a player with more than 11 different cards play', () => {
		expect(canPlayMatch(aPlayerState({ collection: aCollection(25, 40) }))).toBe(true);
	});

	it('refuses a player with 10 different cards and 30 copies in all', () => {
		expect(canPlayMatch(aPlayerState({ collection: aCollection(10, 30) }))).toBe(false);
	});

	it('refuses a player with no cards', () => {
		expect(canPlayMatch(createPlayerState())).toBe(false);
	});
});

describe('recordWin', () => {
	it("adds the division's coins, one win and one win in the division", () => {
		const state = aPlayerState({ coins: 3, wins: 4, losses: 2 });

		expect(recordWin(state)).toMatchObject({
			coins: 3 + divisionFour.winCoins,
			wins: 5,
			losses: 2,
			division: 'division-4',
			divisionWins: 1
		});
	});

	it('pays the prize of the division the player is in', () => {
		const state = aPlayerState({ coins: 0, division: divisionOne.id });

		expect(recordWin(state).coins).toBe(divisionOne.winCoins);
	});

	it('moves the player up one division on the third win and resets the count', () => {
		const state = aPlayerState({ divisionWins: WINS_TO_GO_UP - 1 });

		expect(recordWin(state)).toMatchObject({ division: divisionThree.id, divisionWins: 0 });
	});

	it("pays the old division's prize for the win that moves the player up", () => {
		const state = aPlayerState({ coins: 0, divisionWins: WINS_TO_GO_UP - 1 });

		expect(recordWin(state).coins).toBe(divisionFour.winCoins);
	});

	it('keeps the player in the Champions League on a third win there and counts on', () => {
		const state = aPlayerState({ division: championsLeague.id, divisionWins: WINS_TO_GO_UP - 1 });

		expect(recordWin(state)).toMatchObject({
			division: 'champions-league',
			divisionWins: WINS_TO_GO_UP
		});
	});

	it('leaves the state it was given unchanged', () => {
		const state = aPlayerState({ coins: 1 });
		const before = JSON.stringify(state);

		recordWin(state);

		expect(JSON.stringify(state)).toBe(before);
	});
});

describe('recordLoss', () => {
	it('adds one loss and changes nothing else', () => {
		const state = aPlayerState({
			coins: 9,
			wins: 4,
			losses: 1,
			division: divisionThree.id,
			divisionWins: 2
		});

		expect(recordLoss(state)).toEqual({ ...state, losses: 2 });
	});

	it('never moves the player down, even from the Champions League with no wins there', () => {
		const state = aPlayerState({ division: championsLeague.id, divisionWins: 0 });

		expect(recordLoss(state)).toMatchObject({ division: 'champions-league', divisionWins: 0 });
	});
});
