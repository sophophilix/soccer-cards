import { POSITIONS } from './cards.ts';
import type { Card, CardId, Position } from './cards.ts';
import { lineWorth } from './lineup.ts';
import type { LineUp } from './lineup.ts';
import type { Random } from './random.ts';

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
/** The minute of each moment of a match. */
export const MOMENT_MINUTES = [7, 18, 29, 41, 53, 64, 76, 88] as const;
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
/** How often a shot that isn't a goal is saved. The rest go wide. */
export const SAVE_CHANCE = 0.6;

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

/** Which of the two sides. */
export type SideName = 'home' | 'away';

/** One moment of a match: who won the ball, who shot, who kept goal and how it ended. */
export interface Moment {
	readonly minute: number;
	readonly side: SideName;
	readonly ballWinner: CardId;
	readonly shooter: CardId;
	readonly keeper: CardId;
	readonly outcome: 'goal' | 'save' | 'wide';
}

/** A whole match: its moments, the final score and who had the tactical edge. */
export interface MatchResult {
	readonly moments: readonly Moment[];
	readonly score: Readonly<Record<SideName, number>>;
	readonly tacticalEdge: SideName | 'none';
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

function pickCard(side: MatchSide, line: Position, random: Random): CardId {
	const inLine = side.lineUp.lines[line];
	const from = inLine.length > 0 ? inLine : POSITIONS.flatMap((each) => side.lineUp.lines[each]);
	const [picked] = random.sample(from, 1);
	if (picked === undefined) {
		throw new RangeError('a side in a match needs at least one card');
	}
	return picked;
}

/** Plays a match of eight moments between two sides and returns the whole result. */
export function playMatch(home: MatchSide, away: MatchSide, random: Random): MatchResult {
	const sides = { home, away };
	const strengths = {
		home: sideStrength(home, away.tactic),
		away: sideStrength(away, home.tactic)
	};
	const moments = MOMENT_MINUTES.map((minute): Moment => {
		const hasHomeBall = random.chance(ballChance(strengths.home, strengths.away));
		const [side, other] = hasHomeBall ? (['home', 'away'] as const) : (['away', 'home'] as const);
		const isGoal = random.chance(scoringChance(strengths[side], strengths[other]));
		const miss = (): 'save' | 'wide' => (random.chance(SAVE_CHANCE) ? 'save' : 'wide');
		const outcome = isGoal ? 'goal' : miss();
		const ballWinner = pickCard(sides[side], 'MF', random);
		const shooter = pickCard(sides[side], 'FW', random);
		const keeper = pickCard(sides[other], 'GK', random);
		return { minute, side, ballWinner, shooter, keeper, outcome };
	});
	const goalsOf = (side: SideName): number =>
		moments.filter((moment) => moment.side === side && moment.outcome === 'goal').length;
	const awayEdge = TACTICS[away.tactic].beats === home.tactic ? 'away' : 'none';
	return {
		moments,
		score: { home: goalsOf('home'), away: goalsOf('away') },
		tacticalEdge: TACTICS[home.tactic].beats === away.tactic ? 'home' : awayEdge
	};
}
