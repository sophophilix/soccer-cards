import { describe, expect, it } from 'vitest';
import {
	FORMATIONS,
	OUT_OF_POSITION_FACTOR,
	TEAM_SIZE,
	WRONG_IN_GOAL_FACTOR,
	bestTeam,
	checkCardSet,
	lineUp,
	lineWorth,
	toCardId
} from './index.ts';
import type { Card, CardId, CheckedCardSet, Formation, LineUp, Position } from './index.ts';
import { aCard, aCheckedCardSetOf } from './testing/cards.ts';

// A test card has attack 70, control 65 and defence 60 unless it says otherwise.
const card = (id: string, position: Position, overrides: Partial<Card> = {}): Card =>
	aCard({ id: toCardId(id), position, ...overrides });
// Cards named `FW-1`, `FW-2` and so on, each one overall point below the one before.
const cards = (position: Position, count: number): Card[] =>
	Array.from({ length: count }, (_, index) =>
		card(`${position}-${String(index + 1)}`, position, { overall: 80 - index })
	);
const idsOf = (team: readonly Card[]): CardId[] => team.map((each) => each.id);
const lineUpOf = (team: readonly Card[], formation: Formation): LineUp | undefined => {
	const result = lineUp(idsOf(team), aCheckedCardSetOf(team), formation);
	return result.ok ? result.value : undefined;
};
const bestOf = (owned: readonly Card[], formation: Formation): CardId[] =>
	bestTeam(aCheckedCardSetOf(owned), idsOf(owned), formation);
const reasonOf = (team: readonly CardId[], cardSet: CheckedCardSet): string | undefined => {
	const result = lineUp(team, cardSet, '4-4-2');
	return result.ok ? undefined : result.reason;
};

describe('formations', () => {
	it('lists four formations, each with one goalkeeper and 11 cards', () => {
		expect(FORMATIONS).toEqual({
			'4-4-2': { FW: 2, MF: 4, DF: 4, GK: 1 },
			'4-3-3': { FW: 3, MF: 3, DF: 4, GK: 1 },
			'3-5-2': { FW: 2, MF: 5, DF: 3, GK: 1 },
			'5-3-2': { FW: 2, MF: 3, DF: 5, GK: 1 }
		});
	});

	it('names the team size and the two factors', () => {
		expect([TEAM_SIZE, OUT_OF_POSITION_FACTOR, WRONG_IN_GOAL_FACTOR]).toEqual([11, 0.8, 0.5]);
	});
});

describe('lineWorth', () => {
	it.each([
		['its attack up front', 'FW', 70],
		['its control in midfield', 'MF', 65],
		['its defence at the back', 'DF', 60],
		['its defence in goal', 'GK', 60]
	] as const)('is %s for a card in its own position', (_name, line, worth) => {
		expect(lineWorth(card('own', line), line)).toBe(worth);
	});

	it.each([
		['a midfielder up front', 'MF', 'FW', 70 * 0.8],
		['a forward at the back', 'FW', 'DF', 60 * 0.8],
		['a goalkeeper at the back', 'GK', 'DF', 60 * 0.5],
		['a goalkeeper up front', 'GK', 'FW', 70 * 0.5],
		['a defender in goal', 'DF', 'GK', 60 * 0.5]
	] as const)('is worth less for %s', (_name, position, line, worth) => {
		expect(lineWorth(card('other', position), line)).toBe(worth);
	});
});

describe('lineUp', () => {
	it('puts cards in their own position, highest overall first', () => {
		const team = [...cards('GK', 1), ...cards('DF', 4), ...cards('MF', 4), ...cards('FW', 2)];

		expect(lineUpOf(team.toReversed(), '4-4-2')).toEqual({
			lines: {
				FW: ['FW-1', 'FW-2'],
				MF: ['MF-1', 'MF-2', 'MF-3', 'MF-4'],
				DF: ['DF-1', 'DF-2', 'DF-3', 'DF-4'],
				GK: ['GK-1']
			},
			outOfPosition: []
		});
	});

	it('fills the gaps from attack to goal with the cards left over, with no goalkeeper', () => {
		const team = [...cards('FW', 1), ...cards('MF', 5), ...cards('DF', 5)];

		// MF-5 and DF-5 have the same overall, so DF-5 goes first by id.
		expect(lineUpOf(team, '4-3-3')).toEqual({
			lines: {
				FW: ['FW-1', 'MF-4', 'DF-5'],
				MF: ['MF-1', 'MF-2', 'MF-3'],
				DF: ['DF-1', 'DF-2', 'DF-3', 'DF-4'],
				GK: ['MF-5']
			},
			outOfPosition: ['MF-4', 'DF-5', 'MF-5']
		});
	});

	it('puts one of eleven forwards in goal at half worth', () => {
		const team = cards('FW', 11);

		const inGoal = team.filter((each) => lineUpOf(team, '4-4-2')?.lines.GK.includes(each.id));

		expect(inGoal.map((each) => [each.id, lineWorth(each, 'GK')])).toEqual([['FW-11', 30]]);
	});

	it('orders cards with equal overall by id, whatever order they came in', () => {
		const team = [...cards('DF', 4), ...cards('MF', 4), ...cards('GK', 1)];
		const forwards = [card('c', 'FW'), card('a', 'FW'), card('b', 'FW')];

		expect(lineUpOf([...team.slice(1), ...forwards], '4-4-2')?.lines.FW).toEqual(['a', 'b']);
	});

	it.each([
		['10 cards', idsOf(cards('MF', 10)), 'not-eleven-different-cards'],
		['12 cards', idsOf(cards('MF', 12)), 'not-eleven-different-cards'],
		[
			'a repeated card',
			[...idsOf(cards('MF', 10)), toCardId('MF-1')],
			'not-eleven-different-cards'
		],
		['a card outside the set', [...idsOf(cards('MF', 10)), toCardId('lost')], 'card-not-in-set'],
		[
			'a repeated card and a card outside the set',
			[...idsOf(cards('MF', 9)), toCardId('MF-1'), toCardId('lost')],
			'not-eleven-different-cards'
		]
	])('returns an error result for %s', (_name, team, reason) => {
		expect(reasonOf(team, aCheckedCardSetOf(cards('MF', 12)))).toBe(reason);
	});

	it('is never given a set that repeats a team card and lacks another: the check refuses it', () => {
		const team = cards('MF', 11);
		const cardSet = [...team.slice(0, 10), card('MF-1', 'FW')];

		expect(checkCardSet(cardSet)).toEqual({
			ok: false,
			reason: 'repeated-card-id',
			cardId: 'MF-1'
		});
	});

	it('takes only a checked card set', () => {
		const team = cards('MF', 11);

		// @ts-expect-error -- a plain list of cards is not a checked card set
		expect(lineUp(idsOf(team), team, '4-4-2').ok).toBe(true);
	});
});

describe('bestTeam', () => {
	it('picks the best in each line by worth there, then the best of the rest by overall', () => {
		const forwards = [
			card('star', 'FW', { overall: 90, attack: 60 }),
			card('shooter', 'FW', { overall: 50, attack: 90 }),
			card('runner', 'FW', { overall: 40, attack: 80 })
		];
		const owned = [...cards('GK', 2), ...cards('DF', 4), ...cards('MF', 3), ...forwards];

		expect(bestOf(owned, '4-4-2')).toEqual([
			...['shooter', 'runner', 'MF-1', 'MF-2', 'MF-3'],
			...['DF-1', 'DF-2', 'DF-3', 'DF-4', 'GK-1', 'star']
		]);
	});

	it('orders cards with equal worth by id, whatever order they came in', () => {
		const forwards = [card('c', 'FW'), card('a', 'FW'), card('b', 'FW')];

		expect(bestOf([...forwards, ...cards('MF', 12)], '4-4-2').slice(0, 2)).toEqual(['a', 'b']);
	});

	it('returns every card when it is given fewer than 11', () => {
		const owned = [...cards('GK', 2), ...cards('FW', 3)];

		expect(bestOf(owned, '4-4-2')).toEqual(['FW-1', 'FW-2', 'GK-1', 'GK-2', 'FW-3']);
	});

	it('chooses only from the ids it is given', () => {
		const owned = cards('FW', 3);

		expect(bestTeam(aCheckedCardSetOf(owned), [toCardId('FW-2')], '4-4-2')).toEqual(['FW-2']);
	});

	it('ignores an id that is not in the set', () => {
		const ids = [toCardId('FW-1'), toCardId('missing')];

		expect(bestTeam(aCheckedCardSetOf(cards('FW', 2)), ids, '4-4-2')).toEqual(['FW-1']);
	});

	it('counts an id given twice once', () => {
		const ids = [toCardId('FW-2'), toCardId('FW-2')];

		expect(bestTeam(aCheckedCardSetOf(cards('FW', 2)), ids, '4-4-2')).toEqual(['FW-2']);
	});

	it('takes only a checked card set', () => {
		const owned = cards('FW', 2);

		// @ts-expect-error -- a plain list of cards is not a checked card set
		expect(bestTeam(owned, idsOf(owned), '4-4-2')).toEqual(['FW-1', 'FW-2']);
	});
});
