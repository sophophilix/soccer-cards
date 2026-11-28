import { PAIRS_BOARD_COINS, PAIRS_FEW_TURNS_BONUS } from './economy.ts';
import type { PairsBoard, PairsSize } from './pairs.ts';
import type { PlayerState } from './state.ts';

/** A board that remembers whether its coins were paid. */
export type PaidPairsBoard = PairsBoard & { readonly isPaid?: boolean };

/** Why a board is not paid. */
export type PairsPayRefusal = 'board-unfinished';

/** The paid board and the new state, or the reason it was refused. */
export type PairsPayResult =
	| {
			readonly ok: true;
			readonly value: {
				readonly board: PaidPairsBoard;
				readonly state: PlayerState;
			};
	  }
	| { readonly ok: false; readonly reason: PairsPayRefusal };

/** The most turns a board of this size can take and still earn the few-turns bonus. */
export function pairsFewTurnsLimit(size: PairsSize): number {
	return size * 2;
}

/** Whether a board of this size finished in few enough turns to earn the bonus. */
export function earnsPairsFewTurnsBonus(size: PairsSize, turns: number): boolean {
	return turns <= pairsFewTurnsLimit(size);
}

/** Pays a finished board once: by size, plus a bonus for few turns. */
export function payPairsBoard(board: PaidPairsBoard, state: PlayerState): PairsPayResult {
	if (!board.isComplete) {
		return { ok: false, reason: 'board-unfinished' };
	}
	if (board.isPaid === true) {
		return { ok: true, value: { board, state } };
	}
	const bonus = earnsPairsFewTurnsBonus(board.size, board.turns) ? PAIRS_FEW_TURNS_BONUS : 0;
	return {
		ok: true,
		value: {
			board: { ...board, isPaid: true },
			state: { ...state, coins: state.coins + PAIRS_BOARD_COINS[board.size] + bonus }
		}
	};
}
