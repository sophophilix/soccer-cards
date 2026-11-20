import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DIVISIONS, FORMATIONS, TACTIC_IDS, computerSide, createRandom } from './index.ts';
import { aCheckedCardSet } from './testing/cards.ts';

const seed = fc.integer();
const division = fc.constantFrom(...DIVISIONS);
// At least 11 cards, with every tier, so every set can field a side.
const cardSet = fc
	.record({
		base: fc.integer({ min: 8, max: 40 }),
		rare: fc.integer({ min: 1, max: 8 }),
		legend: fc.integer({ min: 1, max: 4 }),
		icon: fc.integer({ min: 1, max: 2 })
	})
	.map(aCheckedCardSet);

describe('computer side properties', () => {
	it('fields 11 different cards from the set', () => {
		fc.assert(
			fc.property(division, cardSet, seed, (chosen, cards, start) => {
				const result = computerSide(chosen, cards, createRandom(start));
				const team = result.ok ? result.value.team : [];
				const ids = cards.map((card) => card.id);

				expect(new Set(team).size).toBe(11);
				expect(team.every((id) => ids.includes(id))).toBe(true);
			})
		);
	});

	it('picks a formation and a tactic from their lists', () => {
		fc.assert(
			fc.property(division, cardSet, seed, (chosen, cards, start) => {
				const result = computerSide(chosen, cards, createRandom(start));

				expect(Object.keys(FORMATIONS)).toContain(result.ok ? result.value.formation : '');
				expect(TACTIC_IDS).toContain(result.ok ? result.value.tactic : '');
			})
		);
	});

	it('gives the same side for the same seed', () => {
		fc.assert(
			fc.property(division, cardSet, seed, (chosen, cards, start) => {
				const first = computerSide(chosen, cards, createRandom(start));
				const second = computerSide(chosen, cards, createRandom(start));

				expect(second).toEqual(first);
			})
		);
	});
});
