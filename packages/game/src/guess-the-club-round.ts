import { GUESS_FINISH_COINS, GUESS_RIGHT_COINS } from './economy.ts';
import type { GuessRound } from './guess-the-club.ts';
import type { PlayerState } from './state.ts';
import type { ClubId } from './transfer-trail.ts';

/** A round that remembers which questions have been answered, and whether it is finished. */
export interface PaidGuessRound {
	readonly round: GuessRound;
	readonly answered: readonly number[];
	readonly isFinished: boolean;
}

/** Why a paid step is refused. */
export type GuessRefusal = 'unknown-question' | 'unknown-club' | 'questions-unanswered';

/** A paid step: the value on success, or a literal reason. */
export type GuessResult<Value, Reason extends GuessRefusal> =
	{ readonly ok: true; readonly value: Value } | { readonly ok: false; readonly reason: Reason };

/** Starts paying for a dealt round: nothing is answered and it is not finished. */
export function openGuessRound(round: GuessRound): PaidGuessRound {
	return { round, answered: [], isFinished: false };
}

/** Checks a club. Only the first answer to a question pays, and a wrong one takes nothing away. */
export function answerGuess(
	paid: PaidGuessRound,
	state: PlayerState,
	questionIndex: number,
	clubId: ClubId
): GuessResult<
	{ readonly isRight: boolean; readonly paid: PaidGuessRound; readonly state: PlayerState },
	'unknown-question' | 'unknown-club'
> {
	const question = paid.round.questions[questionIndex];
	if (question === undefined) {
		return { ok: false, reason: 'unknown-question' };
	}
	if (!question.options.includes(clubId)) {
		return { ok: false, reason: 'unknown-club' };
	}
	const isRight = clubId === question.hiddenClub;
	if (paid.answered.includes(questionIndex)) {
		return { ok: true, value: { isRight, paid, state } };
	}
	return {
		ok: true,
		value: {
			isRight,
			paid: { ...paid, answered: [...paid.answered, questionIndex] },
			state: isRight ? { ...state, coins: state.coins + GUESS_RIGHT_COINS } : state
		}
	};
}

/** Finishes the round once every question is answered, and pays for finishing once. */
export function finishGuessRound(
	paid: PaidGuessRound,
	state: PlayerState
): GuessResult<
	{ readonly paid: PaidGuessRound; readonly state: PlayerState },
	'questions-unanswered'
> {
	if (paid.isFinished) {
		return { ok: true, value: { paid, state } };
	}
	if (paid.answered.length < paid.round.questions.length) {
		return { ok: false, reason: 'questions-unanswered' };
	}
	return {
		ok: true,
		value: {
			paid: { ...paid, isFinished: true },
			state: { ...state, coins: state.coins + GUESS_FINISH_COINS }
		}
	};
}
