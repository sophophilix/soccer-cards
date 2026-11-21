import { describe, expect, it } from 'vitest';
import { checkCardSet, toCardId } from '@soccer-cards/game';
import type { Card, CardId, CheckedCardSet, Position } from '@soccer-cards/game';
import { arrangeTeam, clearTeam, pickBest, sortOwned, togglePick } from './team-picks.ts';

function aCard(id: string, position: Position, overall: number): Card {
	return {
		id: toCardId(id),
		position,
		tier: 'base',
		overall,
		attack: overall,
		defence: overall,
		control: overall
	};
}

function aSet(cards: readonly Card[]): CheckedCardSet {
	const checked = checkCardSet(cards);
	if (!checked.ok) throw new Error('bad test set');
	return checked.value;
}

const ids = (count: number): CardId[] =>
	Array.from({ length: count }, (_, index) => toCardId(`c${String(index + 1)}`));

describe('togglePick', () => {
	it('puts a player in who is not in the team', () => {
		const result = togglePick(ids(2), toCardId('x'));

		expect(result).toEqual({ ok: true, team: [...ids(2), 'x'] });
	});

	it('takes a player out who is in the team', () => {
		const result = togglePick(ids(3), toCardId('c2'));

		expect(result).toEqual({ ok: true, team: ['c1', 'c3'] });
	});

	it('refuses a twelfth player', () => {
		const result = togglePick(ids(11), toCardId('x'));

		expect(result).toEqual({ ok: false, reason: 'team-full' });
	});

	it('still takes a player out of a full team', () => {
		const result = togglePick(ids(11), toCardId('c11'));

		expect(result).toEqual({ ok: true, team: ids(10) });
	});

	it('never holds a player twice after a double tap', () => {
		const once = togglePick([], toCardId('a'));
		const twice = once.ok ? togglePick(once.team, toCardId('a')) : once;

		expect(twice).toEqual({ ok: true, team: [] });
	});
});

describe('clearTeam', () => {
	it('is empty', () => {
		expect(clearTeam()).toEqual([]);
	});
});

describe('sortOwned', () => {
	const set = aSet([
		aCard('gk', 'GK', 90),
		aCard('df', 'DF', 50),
		aCard('mf-low', 'MF', 40),
		aCard('mf-high', 'MF', 70),
		aCard('fw', 'FW', 10),
		aCard('not-owned', 'FW', 99)
	]);

	it('lists owned cards by line then highest rating, and skips the rest', () => {
		const sorted = sortOwned(set, ['gk', 'df', 'mf-low', 'mf-high', 'fw'].map(toCardId));

		expect(sorted.map((card) => card.id)).toEqual(['fw', 'mf-high', 'mf-low', 'df', 'gk']);
	});

	it('lists a card once when its id is given twice', () => {
		const sorted = sortOwned(set, ['fw', 'fw'].map(toCardId));

		expect(sorted).toHaveLength(1);
	});
});

describe('pickBest', () => {
	it('gives 11 different players and leaves out the weakest forward', () => {
		const cards = [
			aCard('gk', 'GK', 50),
			...Array.from({ length: 4 }, (_, i) => aCard(`df${String(i)}`, 'DF', 50)),
			...Array.from({ length: 4 }, (_, i) => aCard(`mf${String(i)}`, 'MF', 50)),
			...Array.from({ length: 3 }, (_, i) => aCard(`fw${String(i)}`, 'FW', 50 + i))
		];

		const team = pickBest(
			aSet(cards),
			cards.map((card) => card.id),
			'4-4-2'
		);

		expect(new Set(team).size).toBe(11);
		expect(team).not.toContain('fw0');
	});
});

describe('arrangeTeam', () => {
	const set = aSet([aCard('fw', 'FW', 60), aCard('gk', 'GK', 60)]);

	it('puts a partial team in each player own line with nobody out of position', () => {
		const arranged = arrangeTeam(['fw', 'gk'].map(toCardId), set, '4-4-2');

		expect(arranged.lines).toEqual({ FW: ['fw'], MF: [], DF: [], GK: ['gk'] });
		expect(arranged.outOfPosition).toEqual([]);
	});

	it('is empty in every line for an empty team', () => {
		const arranged = arrangeTeam([], set, '4-4-2');

		expect(arranged.lines).toEqual({ FW: [], MF: [], DF: [], GK: [] });
	});
});
