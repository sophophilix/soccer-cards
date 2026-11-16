import { describe, expect, it, vi } from 'vitest';
import {
	JUMBO_PACK_MIX,
	JUMBO_PACK_SIZE,
	STANDARD_PACK_MIX,
	STANDARD_PACK_SIZE,
	createRandom,
	openPack,
	toCardId
} from './index.ts';
import type { Card, CardId, OpenPackResult, Tier } from './index.ts';
import { aCard, aCardSet } from './testing/cards.ts';

const SEED = 20261116;
const PLENTY = { base: 40, rare: 10, legend: 6 };

const idsOf = (result: OpenPackResult): readonly CardId[] => (result.ok ? result.value : []);
const tiersOf = (cardSet: readonly Card[], ids: readonly CardId[]): (Tier | undefined)[] =>
	ids.map((id) => cardSet.find((card) => card.id === id)?.tier);
const repeat = (tier: Tier, count: number): Tier[] => Array.from({ length: count }, () => tier);

describe('openPack', () => {
	it('gives a standard pack of 10 cards: 7 base, then 2 rare, then 1 legend', () => {
		const cardSet = aCardSet(PLENTY);

		const ids = idsOf(openPack(cardSet, 'standard', createRandom(SEED)));

		expect(ids).toHaveLength(10);
		expect(tiersOf(cardSet, ids)).toEqual([
			...repeat('base', 7),
			...repeat('rare', 2),
			...repeat('legend', 1)
		]);
	});

	it('gives a jumbo pack of 20 cards: 15 base, then 3 rare, then 2 legend', () => {
		const cardSet = aCardSet(PLENTY);

		const ids = idsOf(openPack(cardSet, 'jumbo', createRandom(SEED)));

		expect(ids).toHaveLength(20);
		expect(tiersOf(cardSet, ids)).toEqual([
			...repeat('base', 15),
			...repeat('rare', 3),
			...repeat('legend', 2)
		]);
	});

	it('never repeats a card within one pack', () => {
		const ids = idsOf(openPack(aCardSet(PLENTY), 'jumbo', createRandom(SEED)));

		expect(new Set(ids).size).toBe(20);
	});

	it('never repeats a card that the card set lists twice', () => {
		const cardSet = [...aCardSet(JUMBO_PACK_MIX), ...aCardSet(JUMBO_PACK_MIX)];

		const ids = idsOf(openPack(cardSet, 'jumbo', createRandom(SEED)));

		expect(new Set(ids).size).toBe(20);
	});

	it('never repeats a card that the card set lists under two tiers', () => {
		const cardSet = aCardSet(STANDARD_PACK_MIX);
		const baseCardsAsRare = cardSet
			.filter((card) => card.tier === 'base')
			.map((card) => aCard({ id: card.id, tier: 'rare' }));

		const ids = idsOf(openPack([...cardSet, ...baseCardsAsRare], 'standard', createRandom(SEED)));

		expect(new Set(ids).size).toBe(10);
	});

	it('counts only the first listing of a card when it checks a tier', () => {
		const cardSet = [
			...aCardSet({ base: 7, rare: 1, legend: 1 }),
			aCard({ id: toCardId('base-1'), tier: 'rare' })
		];

		const result = openPack(cardSet, 'standard', createRandom(SEED));

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards', tier: 'rare' });
	});

	it('keeps the tier of the first listing when a later one differs', () => {
		const cardSet = [
			aCard({ id: toCardId('base-1'), tier: 'rare' }),
			...aCardSet({ base: 7, rare: 1, legend: 1 })
		];

		const result = openPack(cardSet, 'standard', createRandom(SEED));

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards', tier: 'base' });
	});

	it('draws nothing from the generator when a repeated card leaves a tier short', () => {
		const random = createRandom(SEED);
		const sample = vi.spyOn(random, 'sample');
		const cardSet = [
			...aCardSet({ base: 7, rare: 1, legend: 1 }),
			aCard({ id: toCardId('base-1'), tier: 'rare' })
		];

		openPack(cardSet, 'standard', random);

		expect(sample).not.toHaveBeenCalled();
	});

	it('gives the pack it always gave for a seed and a set with no repeated card', () => {
		const result = openPack(aCardSet(PLENTY), 'standard', createRandom(SEED));

		expect(idsOf(result)).toEqual([
			'base-10',
			'base-8',
			'base-32',
			'base-13',
			'base-30',
			'base-37',
			'base-1',
			'rare-4',
			'rare-6',
			'legend-5'
		]);
	});

	it('gives the same pack for the same seed and card set', () => {
		const cardSet = aCardSet(PLENTY);

		const first = openPack(cardSet, 'standard', createRandom(SEED));
		const second = openPack(cardSet, 'standard', createRandom(SEED));

		expect(first.ok).toBe(true);
		expect(second).toEqual(first);
	});

	it('gives a different pack for a different seed', () => {
		const cardSet = aCardSet(PLENTY);

		const first = openPack(cardSet, 'jumbo', createRandom(1));
		const second = openPack(cardSet, 'jumbo', createRandom(2));

		expect(second).not.toEqual(first);
	});

	it('gives every card of a set that has exactly what a standard pack needs', () => {
		const cardSet = aCardSet(STANDARD_PACK_MIX);

		const ids = idsOf(openPack(cardSet, 'standard', createRandom(SEED)));

		expect([...ids].sort()).toEqual(cardSet.map((card) => card.id).sort());
	});

	it('gives every card of a set that has exactly what a jumbo pack needs', () => {
		const cardSet = aCardSet(JUMBO_PACK_MIX);

		const ids = idsOf(openPack(cardSet, 'jumbo', createRandom(SEED)));

		expect([...ids].sort()).toEqual(cardSet.map((card) => card.id).sort());
	});

	it.each([
		{ tier: 'base', counts: { ...PLENTY, base: 6 } },
		{ tier: 'rare', counts: { ...PLENTY, rare: 1 } },
		{ tier: 'legend', counts: { ...PLENTY, legend: 0 } }
	] as const)('refuses a set one $tier card short and names the tier', ({ tier, counts }) => {
		const result = openPack(aCardSet(counts), 'standard', createRandom(SEED));

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards', tier });
	});

	it('refuses a jumbo pack from a set that only fills a standard pack', () => {
		const result = openPack(aCardSet(STANDARD_PACK_MIX), 'jumbo', createRandom(SEED));

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards', tier: 'base' });
	});

	it('refuses an empty card set and names the base tier', () => {
		const result = openPack([], 'standard', createRandom(SEED));

		expect(result).toEqual({ ok: false, reason: 'not-enough-cards', tier: 'base' });
	});

	it('draws nothing from the generator when it refuses', () => {
		const random = createRandom(SEED);
		const sample = vi.spyOn(random, 'sample');

		openPack(aCardSet({ ...PLENTY, legend: 0 }), 'standard', random);

		expect(sample).not.toHaveBeenCalled();
	});

	it('leaves the card set it was given unchanged', () => {
		const cardSet = aCardSet(PLENTY);
		const before = cardSet.map((card) => ({ ...card }));

		openPack(cardSet, 'jumbo', createRandom(SEED));

		expect(cardSet).toEqual(before);
	});

	it('refuses a pack kind the game does not have', () => {
		const cardSet = aCardSet(PLENTY);

		// @ts-expect-error TS2345: an unknown pack kind must not compile.
		expect(() => openPack(cardSet, 'mega', createRandom(SEED))).toThrow(RangeError);
	});
});

describe('pack constants', () => {
	it('state a standard pack as 7 base, 2 rare and 1 legend, 10 in all', () => {
		expect(STANDARD_PACK_MIX).toEqual({ base: 7, rare: 2, legend: 1 });
		expect(STANDARD_PACK_SIZE).toBe(10);
	});

	it('state a jumbo pack as 15 base, 3 rare and 2 legend, 20 in all', () => {
		expect(JUMBO_PACK_MIX).toEqual({ base: 15, rare: 3, legend: 2 });
		expect(JUMBO_PACK_SIZE).toBe(20);
	});
});

describe('card factories', () => {
	it('builds a base card unless told otherwise', () => {
		expect(aCard().tier).toBe('base');
		expect(aCard({ tier: 'legend' }).tier).toBe('legend');
	});

	it('builds a card set with a different id for every card', () => {
		const cardSet = aCardSet({ base: 3, rare: 2, legend: 1 });

		expect(new Set(cardSet.map((card) => card.id)).size).toBe(6);
		expect(cardSet.map((card) => card.tier)).toEqual([
			'base',
			'base',
			'base',
			'rare',
			'rare',
			'legend'
		]);
	});
});

describe('toCardId', () => {
	it('refuses an empty or blank id', () => {
		expect(() => toCardId('')).toThrow(RangeError);
		expect(() => toCardId('  ')).toThrow(RangeError);
	});
});
