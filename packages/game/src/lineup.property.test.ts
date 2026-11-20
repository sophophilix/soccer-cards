import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FORMATIONS, POSITIONS, bestTeam, lineUp, toCardId } from './index.ts';
import type { Card, CardId, Formation, LineUp } from './index.ts';
import { aCard, aCheckedCardSetOf } from './testing/cards.ts';

const stat = fc.integer({ min: 1, max: 99 });
const anyId = fc.integer({ min: 1, max: 30 }).map((place) => toCardId(`card-${String(place)}`));
const anyCard = fc
	.record({
		id: anyId,
		position: fc.constantFrom(...POSITIONS),
		overall: stat,
		attack: stat,
		defence: stat,
		control: stat
	})
	.map(aCard);
const team = fc.uniqueArray(anyCard, { minLength: 11, maxLength: 11, selector: (card) => card.id });
const owned = fc.uniqueArray(anyCard, { minLength: 1, maxLength: 30, selector: (card) => card.id });
const formation = fc.constantFrom<Formation>('4-4-2', '4-3-3', '3-5-2', '5-3-2');

const lineUpOf = (cards: readonly Card[], chosen: Formation): LineUp | undefined => {
	const result = lineUp(
		cards.map((card) => card.id),
		aCheckedCardSetOf(cards),
		chosen
	);
	return result.ok ? result.value : undefined;
};
const idsIn = (lines: LineUp['lines'] | undefined): CardId[] =>
	POSITIONS.flatMap((line) => lines?.[line] ?? []);
const idsInOwnPosition = (cards: readonly Card[], lines: LineUp['lines'] | undefined): CardId[] =>
	cards.filter((card) => lines?.[card.position].includes(card.id)).map((card) => card.id);

describe('line-up properties', () => {
	it('holds exactly the cards it was given', () => {
		fc.assert(
			fc.property(team, formation, (cards, chosen) => {
				const placed = idsIn(lineUpOf(cards, chosen)?.lines);

				expect(placed.toSorted()).toEqual(cards.map((card) => card.id).toSorted());
			})
		);
	});

	it('gives each line the count its formation asks for', () => {
		fc.assert(
			fc.property(team, formation, (cards, chosen) => {
				const lines = lineUpOf(cards, chosen)?.lines;

				expect(POSITIONS.map((line) => lines?.[line].length)).toEqual(
					POSITIONS.map((line) => FORMATIONS[chosen][line])
				);
			})
		);
	});

	it('marks no card in its own position as out of position', () => {
		fc.assert(
			fc.property(team, formation, (cards, chosen) => {
				const made = lineUpOf(cards, chosen);

				const marked = idsInOwnPosition(cards, made?.lines).filter((id) =>
					made?.outOfPosition.includes(id)
				);

				expect([made === undefined, marked]).toEqual([false, []]);
			})
		);
	});

	it('returns no repeated card from the best team', () => {
		fc.assert(
			fc.property(owned, fc.array(anyId, { maxLength: 40 }), formation, (cards, ids, chosen) => {
				const best = bestTeam(aCheckedCardSetOf(cards), ids, chosen);

				expect(new Set(best).size).toBe(best.length);
			})
		);
	});
});
