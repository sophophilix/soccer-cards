import { describe, expect, it } from 'vitest';
import * as game from './index.ts';
import { POSITIONS, TACTICS, ballChance, scoringChance, sideStrength, toCardId } from './index.ts';
import type { Card, Position, Strength, Tactic } from './index.ts';
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

	it('names every number of a strength and a chance', () => {
		expect({ ...game }).toMatchObject({
			TACTICAL_EDGE_FACTOR: 1.08,
			EMPTY_LINE_WORTH: 30,
			BALL_EXPONENT: 2,
			EVEN_BALL_CHANCE: 0.5,
			BASE_SCORING_CHANCE: 0.34,
			SHOT_EXPONENT: 2,
			TYPICAL_GOALKEEPER_WORTH: 84,
			GOALKEEPER_EXPONENT: 1.5,
			MIN_SCORING_CHANCE: 0.06,
			MAX_SCORING_CHANCE: 0.7
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

	it('counts a line with no midfielder, forward or goalkeeper as 30', () => {
		const backs = aMatchSide([card('back', 'DF')], { tactic: 'defend' });

		expect(sideStrength(backs, 'defend')).toEqual({
			attack: 30 * 0.88,
			midfield: 30,
			defence: 60 * 1.12,
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

	it.each([
		['adds a form bonus in percent to', 10, 1.1],
		['takes a negative form bonus from', -50, 0.5],
		['takes a form bonus of -100 percent, the lowest, from', -100, 0]
	])('%s every line', (_name, formPercent, factor) => {
		expect(sideStrength(aMatchSide(team('home'), { formPercent }), 'attack')).toEqual({
			attack: 70 * factor,
			midfield: 65 * 1.1 * factor,
			defence: 60 * factor,
			goalkeeper: 60 * factor
		});
	});

	it.each([-101, Number.NaN])('refuses a form bonus of %d percent, and names it', (formPercent) => {
		const side = aMatchSide(team('home'), { formPercent });

		expect(() => sideStrength(side, 'attack')).toThrow(
			new RangeError(`form ${String(formPercent)}`)
		);
	});

	it('lowers the worth of a card in a line that is not its own', () => {
		const [mid, back] = [card('mid', 'MF'), card('back', 'DF')];
		const lines = { FW: [mid.id], MF: [], DF: [], GK: [back.id] };
		const outOfPosition = [mid.id, back.id];
		const side = aMatchSide([mid, back], { lineUp: { lines, outOfPosition } });

		expect(sideStrength(side, 'attack')).toEqual({
			attack: 70 * 0.8,
			midfield: 30 * 1.1,
			defence: 30,
			goalkeeper: 60 * 0.5
		});
	});

	it('refuses a line-up with a card that is not among the cards of the side, and names it', () => {
		const side = { ...aMatchSide(team('home')), cards: [] };

		expect(() => sideStrength(side, 'attack')).toThrow(new RangeError('no card home-FW'));
	});
});

describe('ballChance', () => {
	it('is the midfield squared over the sum of both midfields squared', () => {
		expect(ballChance(strength({ midfield: 60 }), strength({ midfield: 30 }))).toBe(0.8);
	});

	it('is 0.5 when both midfields are 0', () => {
		expect(ballChance(strength({ midfield: 0 }), strength({ midfield: 0 }))).toBe(0.5);
	});
});

describe('scoringChance', () => {
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
		['is never below 0.06', strength({ attack: 7 }), strength(), 0.06],
		['is 0.7 against a defence of 0', strength(), strength({ defence: 0 }), 0.7],
		['is 0.7 against a goalkeeper of 0', strength(), strength({ goalkeeper: 0 }), 0.7],
		[
			'is 0.06 when attack and defence are both 0',
			strength({ attack: 0 }),
			strength({ defence: 0 }),
			0.06
		]
	])('%s', (_name, attacking, defending, expected) => {
		expect(scoringChance(attacking, defending)).toBeCloseTo(expected, 10);
	});
});
