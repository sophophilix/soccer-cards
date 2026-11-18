import { describe, expect, it } from 'vitest';
import * as game from './index.ts';
import { POSITIONS, TACTICS, createRandom, playMatch, sideStrength, toCardId } from './index.ts';
import type { Card, Position, Random, Strength, Tactic } from './index.ts';
import { aCard } from './testing/cards.ts';
import { aMatchSide } from './testing/match.ts';

// A test card has attack 70, control 65 and defence 60 unless it says otherwise.
const card = (id: string, position: Position, overrides: Partial<Card> = {}): Card =>
	aCard({ id: toCardId(id), position, ...overrides });
// One card in each line, named `home-FW`, `home-MF` and so on.
const team = (name: string): Card[] =>
	POSITIONS.map((position) => card(`${name}-${position}`, position));
const strength = (overrides: Partial<Strength> = {}): Strength => ({
	attack: 70,
	midfield: 70,
	defence: 70,
	goalkeeper: 84,
	...overrides
});
// Answers each roll from the list and then false, picks the first card, and notes each
// probability it was asked for.
const stubRandom = (rolls: readonly boolean[], asked: number[] = []): Random => {
	const left = [...rolls];
	return {
		nextInt: (min) => min,
		sample: (items, count) => items.slice(0, count),
		chance: (probability) => {
			asked.push(probability);
			return left.shift() ?? false;
		}
	};
};
const beaten = (tactic: Tactic): Tactic => TACTICS[tactic].beats;

describe('tactics', () => {
	it('lists the tactic ids', () => {
		expect(game.TACTIC_IDS).toEqual(['attack', 'counter', 'possession', 'defend']);
	});

	it("gives each tactic the prototype's factors and the tactic it beats", () => {
		expect(TACTICS).toEqual({
			attack: { attack: 1.1, midfield: 1, defence: 0.9, beats: 'defend' },
			counter: { attack: 1.05, midfield: 0.92, defence: 1.05, beats: 'attack' },
			possession: { attack: 1, midfield: 1.1, defence: 1, beats: 'counter' },
			defend: { attack: 0.88, midfield: 1, defence: 1.12, beats: 'possession' }
		});
	});

	it('beats in one loop of four', () => {
		const loop = [beaten('attack'), beaten('defend'), beaten('possession'), beaten('counter')];

		expect(loop).toEqual(['defend', 'possession', 'counter', 'attack']);
	});

	it('names every number of a match', () => {
		expect({ ...game }).toMatchObject({
			TACTICAL_EDGE_FACTOR: 1.08,
			EMPTY_LINE_WORTH: 30,
			MOMENT_MINUTES: [7, 18, 29, 41, 53, 64, 76, 88],
			BALL_EXPONENT: 2,
			BASE_SCORING_CHANCE: 0.34,
			SHOT_EXPONENT: 2,
			TYPICAL_GOALKEEPER_WORTH: 84,
			GOALKEEPER_EXPONENT: 1.5,
			MIN_SCORING_CHANCE: 0.06,
			MAX_SCORING_CHANCE: 0.7,
			SAVE_CHANCE: 0.6
		});
	});
});

describe('sideStrength', () => {
	it("is the mean worth of each line, times the tactic's factor", () => {
		const cards = [
			card('a', 'FW', { attack: 80 }),
			card('b', 'FW', { attack: 60 }),
			card('c', 'MF', { control: 50 }),
			card('d', 'DF', { defence: 40 }),
			card('e', 'GK', { defence: 90 })
		];

		expect(sideStrength(aMatchSide(cards, { tactic: 'attack' }), 'attack')).toEqual({
			attack: 70 * 1.1,
			midfield: 50,
			defence: 40 * 0.9,
			goalkeeper: 90
		});
	});

	it('counts an empty line as 30', () => {
		expect(sideStrength(aMatchSide([], { tactic: 'defend' }), 'defend')).toEqual({
			attack: 30 * 0.88,
			midfield: 30,
			defence: 30 * 1.12,
			goalkeeper: 30
		});
	});

	it("multiplies every line by 1.08 when the tactic beats the other side's", () => {
		expect(sideStrength(aMatchSide(team('home')), 'counter')).toEqual({
			attack: 70 * 1.08,
			midfield: 65 * 1.1 * 1.08,
			defence: 60 * 1.08,
			goalkeeper: 60 * 1.08
		});
	});

	it('adds a form bonus in percent to every line', () => {
		expect(sideStrength(aMatchSide(team('home'), { formPercent: 10 }), 'attack')).toEqual({
			attack: 70 * 1.1,
			midfield: 65 * 1.1 * 1.1,
			defence: 60 * 1.1,
			goalkeeper: 60 * 1.1
		});
	});
});

describe('the chances in a moment', () => {
	it('wins the ball with its midfield squared over the sum of both squared', () => {
		expect(game.ballChance(strength({ midfield: 60 }), strength({ midfield: 30 }))).toBe(0.8);
	});

	it('never wins the ball when neither side has a midfield worth anything', () => {
		expect(game.ballChance(strength({ midfield: 0 }), strength({ midfield: 0 }))).toBe(0);
	});

	it.each([
		['is 0.34 for equal lines and a typical goalkeeper', strength(), strength(), 0.34],
		['falls with the square of attack over defence', strength({ attack: 35 }), strength(), 0.085],
		[
			'rises against a weak goalkeeper',
			strength(),
			strength({ goalkeeper: 84 / 1.44 }),
			0.34 * 1.728
		],
		['is never above 0.7', strength({ attack: 700 }), strength(), 0.7],
		['is never below 0.06', strength({ attack: 7 }), strength(), 0.06]
	])('scoring %s', (_name, attacking, defending, expected) => {
		expect(game.scoringChance(attacking, defending)).toBeCloseTo(expected, 10);
	});
});

describe('playMatch', () => {
	const home = aMatchSide(team('home'));
	const away = aMatchSide(team('away'));

	it.each([
		[[true, true], 'home', 'away', 'goal', { home: 1, away: 0 }],
		[[false, true], 'away', 'home', 'goal', { home: 0, away: 1 }],
		[[true, false, true], 'home', 'away', 'save', { home: 0, away: 0 }],
		[[true, false, false], 'home', 'away', 'wide', { home: 0, away: 0 }]
	] as const)('rolls %j into a %s moment against %s: %s', (rolls, side, other, outcome, score) => {
		const result = playMatch(home, away, stubRandom(rolls));

		expect([result.moments[0], result.score]).toEqual([
			{
				minute: 7,
				side,
				ballWinner: `${side}-MF`,
				shooter: `${side}-FW`,
				keeper: `${other}-GK`,
				outcome
			},
			score
		]);
	});

	it('has eight moments at the minutes of a match', () => {
		const minutes = playMatch(home, away, createRandom(1)).moments.map((moment) => moment.minute);

		expect(minutes).toEqual([7, 18, 29, 41, 53, 64, 76, 88]);
	});

	it('rolls for the ball, then the shot, then the save, with the odds of the two sides', () => {
		const asked: number[] = [];
		const strong = aMatchSide(team('away'), { formPercent: 10 });
		const [mine, theirs] = [sideStrength(home, 'possession'), sideStrength(strong, 'possession')];

		playMatch(home, strong, stubRandom([], asked));

		expect(asked.slice(0, 3)).toEqual([
			game.ballChance(mine, theirs),
			game.scoringChance(theirs, mine),
			0.6
		]);
	});

	it('names any card of a side with no midfielder, forward or goalkeeper', () => {
		const backs = aMatchSide([card('home-DF', 'DF')]);

		const [first, second] = playMatch(backs, backs, stubRandom([true])).moments;

		expect([first?.ballWinner, first?.shooter, second?.keeper]).toEqual(
			Array.from({ length: 3 }, () => 'home-DF')
		);
	});

	it('refuses a side with no cards', () => {
		expect(() => playMatch(aMatchSide([]), away, stubRandom([]))).toThrow(RangeError);
	});

	it.each([
		['possession', 'counter', 'home'],
		['counter', 'possession', 'away'],
		['attack', 'possession', 'none'],
		['defend', 'defend', 'none']
	] as const)('with %s against %s gives the tactical edge to %s', (mine, theirs, edge) => {
		const result = playMatch(
			aMatchSide(team('home'), { tactic: mine }),
			aMatchSide(team('away'), { tactic: theirs }),
			stubRandom([])
		);

		expect(result.tacticalEdge).toBe(edge);
	});

	it('lets equal sides win about as often as each other over many seeds', () => {
		const scores = Array.from(
			{ length: 20_000 },
			(_, seed) => playMatch(home, away, createRandom(seed)).score
		);
		const homeWins = scores.filter((score) => score.home > score.away).length;
		const awayWins = scores.filter((score) => score.away > score.home).length;

		expect(homeWins / awayWins).toBeCloseTo(1, 1);
	});
});
