import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	PACK_CONTENTS,
	PACK_TEAM_LIMIT,
	TIERS,
	createRandom,
	drawPack,
	packSize
} from './index.ts';
import type { Card, CardId, DrawPackResult, PackKind } from './index.ts';
import { aCard, aCardSet, aCheckedCardSet, aCheckedCardSetOf } from './testing/cards.ts';

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

	describe('with national teams', () => {
		const NATIONS = ['AUS', 'BRA', 'ENG', 'ESP', 'FRA', 'GER', 'ITA', 'JPN'];
		// Every tier cycles through eight nations, so a pack can always stay inside its limit.
		const cardsOfNations = (base: number): Card[] =>
			aCardSet({ base, rare: 12, legend: 6, icon: 3 }).map((card, index) => ({
				...card,
				nationalTeam: NATIONS[index % NATIONS.length] ?? 'AUS'
			}));
		const teamsSet = fc.integer({ min: 40, max: 60 }).map(cardsOfNations);
		const teamOf = (cards: readonly Card[], id: CardId): string | undefined =>
			cards.find((card) => card.id === id)?.nationalTeam;
		const withoutTeams = (cards: readonly Card[]): Card[] =>
			cards.map((card) => aCard({ id: card.id, tier: card.tier }));

		it('never holds more than the limit from one nation', () => {
			fc.assert(
				fc.property(teamsSet, kind, seed, (cards, packKind, packSeed) => {
					const ids = idsOf(drawPack(aCheckedCardSetOf(cards), packKind, createRandom(packSeed)));

					for (const nation of NATIONS) {
						const count = ids.filter((id) => teamOf(cards, id) === nation).length;
						expect(count).toBeLessThanOrEqual(PACK_TEAM_LIMIT[packKind]);
					}
				})
			);
		});

		it('rolls the same lucky tiers as a draw with no limit', () => {
			fc.assert(
				fc.property(teamsSet, kind, seed, (cards, packKind, packSeed) => {
					const limited = idsOf(
						drawPack(aCheckedCardSetOf(cards), packKind, createRandom(packSeed))
					);
					const free = idsOf(
						drawPack(aCheckedCardSetOf(withoutTeams(cards)), packKind, createRandom(packSeed))
					);

					expect(tierRanksOf(cards, limited)).toEqual(tierRanksOf(cards, free));
				})
			);
		});
	});
});
