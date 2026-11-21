import {
	DIVISIONS,
	canPlayMatch,
	computerSide,
	lineUp,
	playMatch,
	recordLoss,
	recordWin,
	sideStrength,
	startShootOut,
	toCardId
} from '@soccer-cards/game';
import type {
	CardId,
	CheckedCardSet,
	Formation,
	LineUp,
	MatchResult,
	MatchSide,
	PlayerState,
	Random,
	ShootOut,
	Strength,
	Tactic
} from '@soccer-cards/game';
import type { PlayerStore, SaveResult } from '../state/player-store.ts';

/** One side of a match as the screen draws it: who plays where, its plan and its strength. */
interface MatchSideView {
	readonly lineUp: LineUp;
	readonly formation: Formation;
	readonly tactic: Tactic;
	readonly strength: Strength;
}

/** A match that has been played: both sides and what happened. The player is home. */
export interface PlayedMatch {
	readonly home: MatchSideView;
	readonly away: MatchSideView;
	readonly result: MatchResult;
}

/** Why a match could not start. */
type MatchRefusal =
	'not-enough-cards' | 'not-eleven-different-cards' | 'card-not-in-set' | 'card-not-owned';

/** The match, or the reason it could not start. */
export type StartMatchResult =
	| { readonly ok: true; readonly value: PlayedMatch }
	| { readonly ok: false; readonly reason: MatchRefusal };

/** What the player chose for a match. */
export interface MatchPlan {
	readonly formation: Formation;
	readonly tactic: Tactic;
	readonly team: readonly CardId[];
}

/** What a saved result gives back to the screen. */
export interface FinishedMatch {
	readonly state: PlayerState;
	readonly coinsWon: number;
	readonly wentUp: boolean;
	readonly saved: SaveResult;
}

/** Returns the ids of the cards the player holds at least once. */
export function ownedCardIds(state: PlayerState): readonly CardId[] {
	return Object.entries(state.collection)
		.filter(([, copies]) => copies > 0)
		.map(([id]) => toCardId(id));
}

/** Fields the computer's side for the player's division, then plays the match. */
export function startMatch(
	state: PlayerState,
	cardSet: CheckedCardSet,
	plan: MatchPlan,
	random: Random
): StartMatchResult {
	if (!canPlayMatch(state)) return { ok: false, reason: 'not-enough-cards' };
	const home = lineUp(plan.team, cardSet, plan.formation);
	if (!home.ok) return home;
	if (!plan.team.every((id) => (state.collection[id] ?? 0) > 0)) {
		return { ok: false, reason: 'card-not-owned' };
	}

	const division = DIVISIONS.find((each) => each.id === state.division);
	if (division === undefined) {
		throw new RangeError(`the player is in an unknown division: ${state.division}`);
	}
	const computer = computerSide(division, cardSet, random);
	if (!computer.ok) return { ok: false, reason: computer.reason };
	const away = lineUp(computer.value.team, cardSet, computer.value.formation);
	if (!away.ok) return away;

	const homeSide = { lineUp: home.value, cards: cardSet, tactic: plan.tactic };
	const awaySide = {
		lineUp: away.value,
		cards: cardSet,
		tactic: computer.value.tactic,
		formPercent: computer.value.formPercent
	};
	const view = (side: MatchSide, formation: Formation, opponent: MatchSide): MatchSideView => ({
		lineUp: side.lineUp,
		formation,
		tactic: side.tactic,
		strength: sideStrength(side, opponent.tactic)
	});
	return {
		ok: true,
		value: {
			home: view(homeSide, plan.formation, awaySide),
			away: view(awaySide, computer.value.formation, homeSide),
			result: playMatch(homeSide, awaySide, random)
		}
	};
}

/** Starts the shoot-out for a drawn match. A match with a winner has none, so this is undefined. */
export function startPenalties(match: PlayedMatch): ShootOut | undefined {
	const { home, away } = match.result.score;
	if (home !== away) return undefined;
	const goalkeepers = {
		player: match.home.strength.goalkeeper,
		opponent: match.away.strength.goalkeeper
	};
	return startShootOut(goalkeepers);
}

/**
 * Records a win or a loss and saves it. The caller passes its newest state, keeps the state
 * returned, and records each match once.
 */
export function finishMatchAndSave(
	store: Pick<PlayerStore, 'save'>,
	state: PlayerState,
	won: boolean
): FinishedMatch {
	const next = won ? recordWin(state) : recordLoss(state);
	return {
		state: next,
		coinsWon: next.coins - state.coins,
		wentUp: next.division !== state.division,
		saved: store.save(next)
	};
}
