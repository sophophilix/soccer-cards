import { describe, expect, it } from 'vitest';
import * as game from './index.ts';
import { POSITIONS, createRandom, playMatch, sideStrength, toCardId } from './index.ts';
import type { Card, Position, Random } from './index.ts';
import { aCard } from './testing/cards.ts';
import { aMatchSide } from './testing/match.ts';

const card = (id: string, position: Position): Card => aCard({ id: toCardId(id), position });
// One card in each line, named `home-FW`, `home-MF` and so on.
const team = (name: string): Card[] =>
	POSITIONS.map((position) => card(`${name}-${position}`, position));
// Answers each roll from the list and then false, picks the first card, and notes each
// probability it was asked for and each list it picked from.
const stubRandom = (rolls: readonly boolean[], asked: unknown[] = []): Random => {
	const left = [...rolls];
	return {
		nextInt: (min) => min,
		sample: (items, count) => {
			asked.push(items);
			return items.slice(0, count);
		},
		chance: (probability) => {
			asked.push(probability);
			return left.shift() ?? false;
		}
	};
};

describe('playMatch', () => {
	const home = aMatchSide(team('home'));
	const away = aMatchSide(team('away'));

	it('names the minutes of a match and the share of missed shots that are saved', () => {
		expect({ ...game }).toMatchObject({
			MOMENT_MINUTES: [7, 18, 29, 41, 53, 64, 76, 88],
			SAVE_CHANCE: 0.6
		});
	});

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

	it('rolls for the ball, the shot, save or wide, then the three cards', () => {
		const asked: unknown[] = [];
		const strong = aMatchSide(team('away'), { formPercent: 10 });
		const [mine, theirs] = [sideStrength(home, 'possession'), sideStrength(strong, 'possession')];

		playMatch(home, strong, stubRandom([], asked));

		expect(asked.slice(0, 6)).toEqual([
			game.ballChance(mine, theirs),
			game.scoringChance(theirs, mine),
			0.6,
			['away-MF'],
			['away-FW'],
			['home-GK']
		]);
	});

	it('does not roll for save or wide after a goal', () => {
		const asked: unknown[] = [];

		playMatch(home, away, stubRandom([true, true], asked));

		expect(asked.slice(2, 5)).toEqual([['home-MF'], ['home-FW'], ['away-GK']]);
	});

	it('names any card of a side with no midfielder, forward or goalkeeper', () => {
		const backs = aMatchSide([card('home-DF', 'DF')]);

		const [first, second] = playMatch(backs, backs, stubRandom([true])).moments;

		expect([first?.ballWinner, first?.shooter, second?.keeper]).toEqual(
			Array.from({ length: 3 }, () => 'home-DF')
		);
	});

	it.each([
		['home', aMatchSide([]), aMatchSide(team('away'))],
		['away', aMatchSide(team('home')), aMatchSide([])]
	] as const)('refuses a %s side with no cards', (_name, mine, theirs) => {
		expect(() => playMatch(mine, theirs, stubRandom([]))).toThrow(RangeError);
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

	it('lets equal sides win about as often as each other over 20,000 seeds', () => {
		const scores = Array.from(
			{ length: 20_000 },
			(_, seed) => playMatch(home, away, createRandom(seed)).score
		);
		const homeWins = scores.filter((score) => score.home > score.away).length;
		const awayWins = scores.filter((score) => score.away > score.home).length;

		expect(homeWins / awayWins).toBeCloseTo(1, 1);
	});
});
