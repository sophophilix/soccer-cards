import { TRAIL_FINISH_COINS, TRAIL_RIGHT_COINS } from './economy.ts';
import type { PlayerState } from './state.ts';
import { checkTrail } from './transfer-trail.ts';
import type { ClubId, PlayerId, TrailCheck, TrailRefusal, TrailRound } from './transfer-trail.ts';

/** A round that remembers which trails had their first check, and whether it is finished. */
export interface PaidTrailRound {
	readonly round: TrailRound;
	readonly checked: readonly PlayerId[];
	readonly isFinished: boolean;
}

/** Why a paid step is refused. */
export type PaidTrailRefusal = 'unknown-player' | 'trails-unchecked' | TrailRefusal;

/** A paid step: the value on success, or a literal reason. */
export type PaidTrailResult<Value, Reason extends PaidTrailRefusal> =
	{ readonly ok: true; readonly value: Value } | { readonly ok: false; readonly reason: Reason };

/** Starts paying for a dealt round: nothing is checked and it is not finished. */
export function openPaidRound(round: TrailRound): PaidTrailRound {
	return { round, checked: [], isFinished: false };
}

/** Checks a player's trail. Only the first check pays, and a wrong trail takes nothing away. */
export function checkTrailInRound(
	paid: PaidTrailRound,
	state: PlayerState,
	playerId: PlayerId,
	answer: readonly ClubId[]
): PaidTrailResult<
	{ readonly check: TrailCheck; readonly paid: PaidTrailRound; readonly state: PlayerState },
	'unknown-player' | TrailRefusal
> {
	const step = paid.round.steps.find((candidate) => candidate.playerId === playerId);
	if (step === undefined) {
		return { ok: false, reason: 'unknown-player' };
	}
	const checked = checkTrail(step, answer);
	if (!checked.ok) {
		return checked;
	}
	if (paid.checked.includes(playerId)) {
		return { ok: true, value: { check: checked.value, paid, state } };
	}
	return {
		ok: true,
		value: {
			check: checked.value,
			paid: { ...paid, checked: [...paid.checked, playerId] },
			state: checked.value.isRight ? { ...state, coins: state.coins + TRAIL_RIGHT_COINS } : state
		}
	};
}

/** Finishes the round once every trail has had its first check, and pays for finishing once. */
export function finishTrailRound(
	paid: PaidTrailRound,
	state: PlayerState
): PaidTrailResult<
	{ readonly paid: PaidTrailRound; readonly state: PlayerState },
	'trails-unchecked'
> {
	if (paid.isFinished) {
		return { ok: true, value: { paid, state } };
	}
	if (paid.checked.length < paid.round.steps.length) {
		return { ok: false, reason: 'trails-unchecked' };
	}
	return {
		ok: true,
		value: {
			paid: { ...paid, isFinished: true },
			state: { ...state, coins: state.coins + TRAIL_FINISH_COINS }
		}
	};
}
