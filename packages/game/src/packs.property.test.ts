import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	JUMBO_PACK_MIX,
	JUMBO_PACK_SIZE,
	STANDARD_PACK_SIZE,
	createRandom,
	openPack,
	packMix
} from './index.ts';
import type { CardId, OpenPackResult, PackKind } from './index.ts';
import { aCardSet } from './testing/cards.ts';

// A fixed seed, so every run of a commit checks the same inputs.
fc.configureGlobal({ seed: 20261116 });

const PACK_SIZES = { standard: STANDARD_PACK_SIZE, jumbo: JUMBO_PACK_SIZE } as const;
const SPARE_CARDS = 30;

const seed = fc.integer();
const kind = fc.constantFrom<PackKind>('standard', 'jumbo');
const tierCount = (atLeast: number): fc.Arbitrary<number> =>
	fc.integer({ min: atLeast, max: atLeast + SPARE_CARDS });
// Big enough for either kind of pack.
const fullCardSet = fc
	.record({
		base: tierCount(JUMBO_PACK_MIX.base),
		rare: tierCount(JUMBO_PACK_MIX.rare),
		legend: tierCount(JUMBO_PACK_MIX.legend)
	})
	.map(aCardSet);
// Any size, so some sets are too small for the pack.
const anyCardSet = fc
	.record({ base: tierCount(0), rare: fc.nat(6), legend: fc.nat(4) })
	.map(aCardSet);

const idsOf = (result: OpenPackResult): readonly CardId[] => (result.ok ? result.value : []);

describe('openPack properties', () => {
	it('gives the pack its mix, in reveal order: base, then rare, then legend', () => {
		fc.assert(
			fc.property(fullCardSet, kind, seed, (cardSet, packKind, packSeed) => {
				const mix = packMix(packKind);
				const ids = idsOf(openPack(cardSet, packKind, createRandom(packSeed)));

				const tiers = ids.map((id) => cardSet.find((card) => card.id === id)?.tier);

				expect(tiers).toEqual([
					...Array.from({ length: mix.base }, () => 'base'),
					...Array.from({ length: mix.rare }, () => 'rare'),
					...Array.from({ length: mix.legend }, () => 'legend')
				]);
				expect(ids).toHaveLength(PACK_SIZES[packKind]);
			})
		);
	});

	it('never repeats a card within one pack', () => {
		fc.assert(
			fc.property(fullCardSet, kind, seed, (cardSet, packKind, packSeed) => {
				const ids = idsOf(openPack(cardSet, packKind, createRandom(packSeed)));

				expect(new Set(ids).size).toBe(PACK_SIZES[packKind]);
			})
		);
	});

	it('gives the same result for the same seed and card set', () => {
		fc.assert(
			fc.property(anyCardSet, kind, seed, (cardSet, packKind, packSeed) => {
				const first = openPack(cardSet, packKind, createRandom(packSeed));
				const second = openPack(cardSet, packKind, createRandom(packSeed));

				expect(second).toEqual(first);
			})
		);
	});

	it('gives a full pack or a refusal, never a short pack', () => {
		fc.assert(
			fc.property(anyCardSet, kind, seed, (cardSet, packKind, packSeed) => {
				const result = openPack(cardSet, packKind, createRandom(packSeed));

				expect([0, PACK_SIZES[packKind]]).toContain(idsOf(result).length);
				expect(result.ok).toBe(idsOf(result).length === PACK_SIZES[packKind]);
			})
		);
	});
});
