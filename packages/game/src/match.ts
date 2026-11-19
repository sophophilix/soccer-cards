import type { Card, Position } from './cards.ts';
import { lineWorth } from './lineup.ts';
import type { LineUp } from './lineup.ts';

/** The tactics: All-out attack, Counter-attack, Keep the ball and Park the bus. */
export const TACTIC_IDS = ['attack', 'counter', 'possession', 'defend'] as const;

/** The id of a tactic. */
export type Tactic = (typeof TACTIC_IDS)[number];

/** What each tactic does to each line, and the one tactic it beats. */
export const TACTICS = {
	attack: { attack: 1.1, midfield: 1, defence: 0.9, beats: 'defend' },
	counter: { attack: 1.05, midfield: 0.92, defence: 1.05, beats: 'attack' },
	possession: { attack: 1, midfield: 1.1, defence: 1, beats: 'counter' },
	defend: { attack: 0.88, midfield: 1, defence: 1.12, beats: 'possession' }
} as const satisfies Record<
	Tactic,
	{ attack: number; midfield: number; defence: number; beats: Tactic }
>;

/** What every line is multiplied by for the side whose tactic beats the other's. */
export const TACTICAL_EDGE_FACTOR = 1.08;
/** What a line with no card in it is worth. */
export const EMPTY_LINE_WORTH = 30;
/** The power the midfields are raised to in the fight for the ball. */
export const BALL_EXPONENT = 2;
/** The probability of winning the ball when neither midfield is worth anything. */
export const EVEN_BALL_CHANCE = 0.5;
/** The scoring probability when attack equals defence and the goalkeeper is typical. */
export const BASE_SCORING_CHANCE = 0.34;
/** The power the attack over the defence is raised to in a shot. */
export const SHOT_EXPONENT = 2;
/** The worth of a typical goalkeeper. */
export const TYPICAL_GOALKEEPER_WORTH = 84;
/** The power the typical goalkeeper over the goalkeeper is raised to in a shot. */
export const GOALKEEPER_EXPONENT = 1.5;
/** The lowest scoring probability. */
export const MIN_SCORING_CHANCE = 0.06;
/** The highest scoring probability. */
export const MAX_SCORING_CHANCE = 0.7;

const PERCENT = 100;

/** One team in a match: its line-up, the cards to look its ids up in, and its plan. */
export interface MatchSide {
	readonly lineUp: LineUp;
	readonly cards: readonly Card[];
	readonly tactic: Tactic;
	/** A bonus on every line, in percent. */
	readonly formPercent?: number;
}

/** How strong each line of a side is in one match. */
export interface Strength {
	readonly attack: number;
	readonly midfield: number;
	readonly defence: number;
	readonly goalkeeper: number;
}

/** The strength of each line: the mean worth of its cards, times the tactic, edge and form. */
export function sideStrength(side: MatchSide, opponentTactic: Tactic): Strength {
	const tactic = TACTICS[side.tactic];
	const formPercent = side.formPercent ?? 0;
	// Below -100 a line would be worth less than nothing. Written so that NaN fails it too.
	if (!(formPercent >= -PERCENT)) {
		throw new RangeError(`form ${String(formPercent)}`);
	}
	const boost =
		(tactic.beats === opponentTactic ? TACTICAL_EDGE_FACTOR : 1) * (1 + formPercent / PERCENT);
	const cardOf = new Map(side.cards.map((card) => [card.id, card]));
	const mean = (line: Position): number => {
		const worths = side.lineUp.lines[line].map((id) => {
			const card = cardOf.get(id);
			if (card === undefined) {
				throw new RangeError(`no card ${id}`);
			}
			return lineWorth(card, line);
		});
		return worths.length === 0
			? EMPTY_LINE_WORTH
			: worths.reduce((sum, worth) => sum + worth, 0) / worths.length;
	};
	return {
		attack: mean('FW') * tactic.attack * boost,
		midfield: mean('MF') * tactic.midfield * boost,
		defence: mean('DF') * tactic.defence * boost,
		goalkeeper: mean('GK') * boost
	};
}

/** The probability that the first side wins the ball in a moment. */
export function ballChance(side: Strength, opponent: Strength): number {
	const mine = side.midfield ** BALL_EXPONENT;
	const both = mine + opponent.midfield ** BALL_EXPONENT;
	return both === 0 ? EVEN_BALL_CHANCE : mine / both;
}

/** The probability that the side with the ball scores in a moment. */
export function scoringChance(attacking: Strength, defending: Strength): number {
	const chance =
		BASE_SCORING_CHANCE *
		(attacking.attack / defending.defence) ** SHOT_EXPONENT *
		(TYPICAL_GOALKEEPER_WORTH / defending.goalkeeper) ** GOALKEEPER_EXPONENT;
	// Nothing over nothing is not a number. It counts as the lowest chance.
	return Math.min(MAX_SCORING_CHANCE, Math.max(MIN_SCORING_CHANCE, chance || 0));
}
