import { describe, expect, it } from 'vitest';
import { answerGuess, createPlayerState, finishGuessRound } from './index.ts';
import { openGuessRound } from './guess-the-club-round.ts';
import type { PaidGuessRound } from './guess-the-club-round.ts';
import type { GuessQuestion } from './guess-the-club.ts';

const aQuestion = (n: number): GuessQuestion => ({
	playerId: `p${String(n)}`,
	hiddenClub: 'red',
	hiddenSpells: [0],
	options: ['red', 'green', 'blue', 'gold']
});
const aRound = (count: number): PaidGuessRound =>
	openGuessRound({ questions: Array.from({ length: count }, (_, i) => aQuestion(i)) });
const stateWith = (coins: number) => ({ ...createPlayerState(), coins });

function answer(paid: PaidGuessRound, coins: number, index: number, club: string) {
	const result = answerGuess(paid, stateWith(coins), index, club);
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.value;
}

describe('answerGuess', () => {
	it('says a right club is right and pays 1 coin', () => {
		const value = answer(aRound(5), 3, 0, 'red');

		expect(value.isRight).toBe(true);
		expect(value.state.coins).toBe(4);
	});

	it('says a wrong club is wrong and pays nothing', () => {
		const value = answer(aRound(5), 3, 0, 'green');

		expect(value.isRight).toBe(false);
		expect(value.state.coins).toBe(3);
	});

	it('ignores a second answer and pays nothing for it', () => {
		const first = answer(aRound(5), 0, 0, 'red');
		const second = answer(first.paid, first.state.coins, 0, 'red');

		expect(second.state.coins).toBe(1);
		expect(second.paid).toBe(first.paid);
	});

	it('does not pay a right answer after a wrong first one', () => {
		const first = answer(aRound(5), 0, 0, 'green');
		const second = answer(first.paid, first.state.coins, 0, 'red');

		expect(second.state.coins).toBe(0);
	});

	it('never changes the old state or round', () => {
		const paid = aRound(5);
		const state = stateWith(3);

		answerGuess(paid, state, 0, 'red');

		expect(state.coins).toBe(3);
		expect(paid.answered).toEqual([]);
	});

	it('refuses a question outside the round', () => {
		expect(answerGuess(aRound(5), stateWith(0), 5, 'red')).toEqual({
			ok: false,
			reason: 'unknown-question'
		});
	});

	it('refuses a negative question index', () => {
		expect(answerGuess(aRound(5), stateWith(0), -1, 'red')).toEqual({
			ok: false,
			reason: 'unknown-question'
		});
	});

	it('refuses a club that is not one of the options', () => {
		expect(answerGuess(aRound(5), stateWith(0), 0, 'purple')).toEqual({
			ok: false,
			reason: 'unknown-club'
		});
	});
});

describe('finishGuessRound', () => {
	it('refuses before every question is answered', () => {
		const first = answer(aRound(3), 0, 0, 'red');

		expect(finishGuessRound(first.paid, first.state)).toEqual({
			ok: false,
			reason: 'questions-unanswered'
		});
	});

	it('pays 2 coins once every question is answered', () => {
		let paid = aRound(3);
		let coins = 0;
		for (const index of [0, 1, 2]) {
			const value = answer(paid, coins, index, 'green');
			paid = value.paid;
			coins = value.state.coins;
		}
		const result = finishGuessRound(paid, stateWith(coins));

		expect(result.ok && result.value.state.coins).toBe(2);
		expect(result.ok && result.value.paid.isFinished).toBe(true);
	});

	it('pays nothing a second time', () => {
		const paid = answer(aRound(1), 0, 0, 'red').paid;
		const first = finishGuessRound(paid, stateWith(1));
		if (!first.ok) {
			throw new Error(first.reason);
		}
		const second = finishGuessRound(first.value.paid, first.value.state);

		expect(second.ok && second.value.state.coins).toBe(3);
	});

	it('pays 1 per right answer plus 2 for a round of fewer than 5 questions', () => {
		let paid = aRound(2);
		let state = stateWith(0);
		for (const index of [0, 1]) {
			const value = answer(paid, state.coins, index, 'red');
			paid = value.paid;
			state = value.state;
		}
		const result = finishGuessRound(paid, state);

		expect(result.ok && result.value.state.coins).toBe(4);
	});
});
