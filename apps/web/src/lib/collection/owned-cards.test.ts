import { toCardId } from '@soccer-cards/game';
import type { Card } from '@soccer-cards/game';
import { expect, it } from 'vitest';
import { cardViewProps, listOwnedCards } from './owned-cards.ts';

function aCard(id: string, overrides: Partial<Card> = {}): Card {
	const stats = { overall: 70, attack: 70, defence: 50, control: 60 };
	return { id: toCardId(id), tier: 'base', position: 'FW', ...stats, ...overrides };
}

const facesOf = (cards: readonly Card[]): Map<Card['id'], { displayName: string }> =>
	new Map(cards.map((card) => [card.id, { displayName: card.id }]));

it('sorts the highest tier first, then the highest overall, then by id', () => {
	const cards = [
		aCard('b-base', { overall: 60 }),
		aCard('a-base', { overall: 60 }),
		aCard('c-base', { overall: 80 }),
		aCard('d-icon', { tier: 'icon', overall: 50 }),
		aCard('e-rare', { tier: 'rare' }),
		aCard('f-legend', { tier: 'legend' })
	];
	const collection = Object.fromEntries(cards.map((card) => [card.id, 1]));

	const owned = listOwnedCards(collection, cards, facesOf(cards));

	expect(owned.map((entry) => entry.id)).toEqual([
		'd-icon',
		'f-legend',
		'e-rare',
		'c-base',
		'a-base',
		'b-base'
	]);
});

it('gives the copies of each card, and nothing for an empty collection', () => {
	const cards = [aCard('a'), aCard('b')];
	const collection = { [toCardId('a')]: 1, [toCardId('b')]: 3 };

	expect(listOwnedCards({}, cards, facesOf(cards))).toEqual([]);
	const owned = listOwnedCards(collection, cards, facesOf(cards));
	expect(owned.map((entry) => entry.count).toSorted()).toEqual([1, 3]);
});

it('keeps a card that is not in the set as unknown, after the known cards', () => {
	const cards = [aCard('a', { overall: 10 })];
	const collection = { [toCardId('gone')]: 2, [toCardId('a')]: 1 };

	const owned = listOwnedCards(collection, cards, facesOf(cards));

	expect(owned.map((entry) => [entry.id, entry.kind, entry.count])).toEqual([
		['a', 'known', 1],
		['gone', 'unknown', 2]
	]);
});

it('leaves out a count that is zero, negative or not whole', () => {
	const cards = [aCard('a'), aCard('b'), aCard('c')];
	const collection = { [toCardId('a')]: 0, [toCardId('b')]: -1, [toCardId('c')]: 1.5 };

	expect(listOwnedCards(collection, cards, facesOf(cards))).toEqual([]);
});

it('prints the card number as the shirt number, and puts the credit on the back', () => {
	const credit = { author: 'Ina Vented', licenseCode: 'CC0-1.0' };
	const photo = { src: '/api/v1/photos/a.webp', widthPx: 600, heightPx: 800, credit };
	const ratings = { kind: 'goalkeeper', diving: 1, handling: 2, kicking: 3 } as const;
	const face = {
		displayName: 'Ann Example',
		cardNumber: 9,
		photo,
		ratings: { ...ratings, reflexes: 4, speed: 5, positioning: 6 }
	};

	const view = cardViewProps(aCard('a', { tier: 'legend', position: 'GK' }), face);

	expect(view.front).toMatchObject({ shirtNumber: 9, tier: 'LEGEND', position: 'GOALKEEPER' });
	expect(view.back?.photoCredit).toEqual(credit);
	expect(cardViewProps(aCard('a'), { displayName: 'A' }).back).toBeUndefined();
});
