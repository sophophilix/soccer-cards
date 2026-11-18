import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PACK_CONTENTS, TIERS, createRandom, drawPack, packSize } from './index.ts';
import type { Card, CardId, DrawPackResult, PackKind } from './index.ts';
import { aCheckedCardSet } from './testing/cards.ts';

const MANY_SEEDS = 200;

const seed = fc.integer();
const kind = fc.constantFrom<PackKind>('standard', 'jumbo');
const cardSet = fc
	.record({
		base: fc.integer({ min: 1, max: 60 }),
		rare: fc.integer({ min: 1, max: 12 }),
		legend: fc.integer({ min: 1, max: 6 }),
		icon: fc.integer({ min: 1, max: 3 })
	})
	.map(aCheckedCardSet);

const idsOf = (result: DrawPackResult): readonly CardId[] => (result.ok ? result.value : []);
const tierRanksOf = (cards: readonly Card[], ids: readonly CardId[]): number[] =>
	ids.map((id) => TIERS.findIndex((tier) => tier === cards.find((card) => card.id === id)?.tier));

describe('drawPack properties', () => {
	it('always gives a pack of its kind’s size, made of cards from the set', () => {
		fc.assert(
			fc.property(cardSet, kind, seed, (cards, packKind, packSeed) => {
				const ids = idsOf(drawPack(cards, packKind, createRandom(packSeed)));

				expect(ids).toHaveLength(packSize(packKind));
				expect(tierRanksOf(cards, ids)).not.toContain(-1);
			})
		);
	});

	it('lists the base cards first, then the lucky cards in tier order', () => {
		fc.assert(
			fc.property(cardSet, kind, seed, (cards, packKind, packSeed) => {
				const baseCount = PACK_CONTENTS[packKind].base;

				const ranks = tierRanksOf(cards, idsOf(drawPack(cards, packKind, createRandom(packSeed))));

				expect(ranks.slice(0, baseCount)).toEqual(Array.from({ length: baseCount }, () => 0));
				expect(ranks.slice(baseCount)).not.toContain(0);
				expect(ranks).toEqual(ranks.toSorted((first, second) => first - second));
			})
		);
	});

	it('gives the same pack for the same seed and card set', () => {
		fc.assert(
			fc.property(cardSet, kind, seed, (cards, packKind, packSeed) => {
				const first = drawPack(cards, packKind, createRandom(packSeed));
				const second = drawPack(cards, packKind, createRandom(packSeed));

				expect(second).toEqual(first);
			})
		);
	});

	it('gives every tier in the odds over many seeds', () => {
		const cards = aCheckedCardSet({ base: 60, rare: 12, legend: 6, icon: 3 });

		const ranks = Array.from({ length: MANY_SEEDS }, (_, packSeed) =>
			tierRanksOf(cards, idsOf(drawPack(cards, 'jumbo', createRandom(packSeed))))
		).flat();

		expect([...new Set(ranks)].toSorted((first, second) => first - second)).toEqual([0, 1, 2, 3]);
	});
});
