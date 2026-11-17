import { describe, expect, it } from 'vitest';
import { checkCardSet, toCardId } from './index.ts';
import type { Card } from './index.ts';
import { aCard, aCardSet } from './testing/cards.ts';

const cardWithId = (id: string): Card => aCard({ id: toCardId(id) });

describe('checkCardSet', () => {
	it('returns the same cards when every id appears once', () => {
		const cards = aCardSet({ base: 3, rare: 2, legend: 1 });

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: true, value: cards });
	});

	it('refuses an id listed twice in one tier and names it', () => {
		const cards = [cardWithId('base-1'), cardWithId('base-2'), cardWithId('base-2')];

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: false, reason: 'repeated-card-id', cardId: 'base-2' });
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

	it('accepts a list of one card', () => {
		const cards = [cardWithId('only')];

		const result = checkCardSet(cards);

		expect(result).toEqual({ ok: true, value: cards });
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
