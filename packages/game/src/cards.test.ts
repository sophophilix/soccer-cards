import { describe, expect, it } from 'vitest';
import { POSITIONS, TIERS, checkCardSet, toCardId } from './index.ts';
import type { Card } from './index.ts';
import { aCard, aCardSet } from './testing/cards.ts';

const cardWithId = (id: string): Card => aCard({ id: toCardId(id) });
// A value from outside the type system, as a broken data file would hold.
const cardFromData = (fields: Readonly<Record<string, unknown>>): Card =>
	Object.assign(aCard({ id: toCardId('odd-one') }), fields);

describe('TIERS and POSITIONS', () => {
	it('lists the tiers from least to most rare', () => {
		expect(TIERS).toEqual(['base', 'rare', 'legend', 'icon']);
	});

	it('lists the positions in the order a line-up shows them', () => {
		expect(POSITIONS).toEqual(['FW', 'MF', 'DF', 'GK']);
	});
});

describe('checkCardSet', () => {
	it.each([
		{ field: 'tier', fields: { tier: 'mythic' } },
		{ field: 'position', fields: { position: 'ST' } },
		{ field: 'position', fields: { position: 'gk' } },
		{ field: 'overall', fields: { overall: 0 } },
		{ field: 'overall', fields: { overall: 100 } },
		{ field: 'overall', fields: { overall: 84.5 } },
		{ field: 'overall', fields: { overall: Number.NaN } },
		{ field: 'overall', fields: { overall: '84' } }
	])('refuses a card with $fields and names the card and the $field', ({ field, fields }) => {
		const cards = [cardWithId('fine'), cardFromData(fields)];

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: false, reason: 'invalid-card-field', cardId: 'odd-one', field });
	});

	it.each([
		{ nationalTeam: 'au' },
		{ nationalTeam: 'AUST' },
		{ nationalTeam: 7 },
		{ nationalTeam: '' }
	])('refuses a card with $nationalTeam as its national team and names the field', (fields) => {
		const result = checkCardSet([cardWithId('fine'), cardFromData(fields)]);

		expect(result).toEqual({
			ok: false,
			reason: 'invalid-card-field',
			cardId: 'odd-one',
			field: 'nationalTeam'
		});
	});

	it('accepts a card with no national team and a card with a three-letter one', () => {
		const cards = [cardWithId('none'), aCard({ id: toCardId('aus'), nationalTeam: 'AUS' })];

		expect(checkCardSet(cards).ok).toBe(true);
	});

	it.each([{ overall: 1 }, { overall: 99 }])('accepts a card with $overall', (fields) => {
		const cards = [aCard(fields)];

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: true, value: cards });
	});

	it('accepts a card of every tier and every position', () => {
		const cards = [
			aCard({ id: toCardId('a'), tier: 'base', position: 'GK' }),
			aCard({ id: toCardId('b'), tier: 'rare', position: 'DF' }),
			aCard({ id: toCardId('c'), tier: 'legend', position: 'MF' }),
			aCard({ id: toCardId('d'), tier: 'icon', position: 'FW' })
		];

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: true, value: cards });
	});

	it('accepts a card set with no Icon', () => {
		const cards = aCardSet({ base: 2, rare: 1, legend: 1, icon: 0 });

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: true, value: cards });
	});

	it('builds Icon cards in the test helper when asked', () => {
		const cards = aCardSet({ base: 1, rare: 0, legend: 0, icon: 2 });

		expect(cards.map((card) => card.tier)).toEqual(['base', 'icon', 'icon']);
	});

	it('refuses an id listed in two tiers and names it', () => {
		const cards = [cardWithId('base-1'), aCard({ id: toCardId('base-1'), tier: 'rare' })];

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: false, reason: 'repeated-card-id', cardId: 'base-1' });
	});

	it('names the id whose repeat comes first when two ids repeat', () => {
		const cards = ['a', 'b', 'b', 'a'].map(cardWithId);

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: false, reason: 'repeated-card-id', cardId: 'b' });
	});

	it('refuses an empty list', () => {
		const result = checkCardSet([]);

		expect(result).toEqual({ ok: false, reason: 'empty-card-set' });
	});

	it('hands back the list it was given, with nothing changed, sorted or copied', () => {
		const cards = [cardWithId('z'), cardWithId('a')];

		const result = checkCardSet(cards);

		expect(result.ok && result.value).toBe(cards);
		expect(cards).toEqual([cardWithId('z'), cardWithId('a')]);
	});

	it('treats ids that differ only by letter case as different ids', () => {
		const cards = [cardWithId('messi'), cardWithId('Messi')];

		const result = checkCardSet(cards);

		expect(result.ok).toBe(true);
	});

	it('counts an id that is the name of a built-in object property like any other id', () => {
		const cards = ['__proto__', 'constructor', 'constructor'].map(cardWithId);

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: false, reason: 'repeated-card-id', cardId: 'constructor' });
	});

	it('gives one refusal for an id listed three times', () => {
		const cards = ['a', 'b', 'a', 'a'].map(cardWithId);

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: false, reason: 'repeated-card-id', cardId: 'a' });
	});
});

describe('toCardId', () => {
	it('refuses an empty or blank id', () => {
		expect(() => toCardId('')).toThrow(RangeError);
		expect(() => toCardId('  ')).toThrow(RangeError);
	});
});
