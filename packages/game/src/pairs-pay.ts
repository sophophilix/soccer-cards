import { PAIRS_BOARD_COINS, PAIRS_FEW_TURNS_BONUS } from './economy.ts';
import type { PairsBoard } from './pairs.ts';
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

/** Pays a finished board once: by size, plus a bonus for few turns. */
export function payPairsBoard(board: PaidPairsBoard, state: PlayerState): PairsPayResult {
	if (!board.isComplete) {
		return { ok: false, reason: 'board-unfinished' };
	}
	if (board.isPaid === true) {
		return { ok: true, value: { board, state } };
	}
	const bonus = board.turns <= board.size * 2 ? PAIRS_FEW_TURNS_BONUS : 0;
	return {
		ok: true,
		value: {
			board: { ...board, isPaid: true },
			state: { ...state, coins: state.coins + PAIRS_BOARD_COINS[board.size] + bonus }
		}
	};
}
