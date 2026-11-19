import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { POSITIONS, TACTIC_IDS, createRandom, playMatch, toCardId } from './index.ts';
import type { MatchSide, SideName } from './index.ts';
import { aCard } from './testing/cards.ts';
import { aMatchSide } from './testing/match.ts';

const stat = fc.integer({ min: 1, max: 99 });
const anyCard = fc
	.record({
		id: fc.integer({ min: 1, max: 30 }).map((place) => toCardId(`card-${String(place)}`)),
		position: fc.constantFrom(...POSITIONS),
		attack: stat,
		defence: stat,
		control: stat
	})
	.map(aCard);
// From one card to a full team, so some lines are empty.
const side: fc.Arbitrary<MatchSide> = fc
	.record({
		cards: fc.uniqueArray(anyCard, { minLength: 1, maxLength: 11, selector: (card) => card.id }),
		tactic: fc.constantFrom(...TACTIC_IDS),
		formPercent: fc.integer({ min: -20, max: 20 })
	})
	.map(({ cards, ...plan }) => aMatchSide(cards, plan));
const seed = fc.integer();

describe('playMatch properties', () => {
	it('scores the count of goal moments for each side', () => {
		fc.assert(
			fc.property(side, side, seed, (home, away, chosen) => {
				const { moments, score } = playMatch(home, away, createRandom(chosen));
				const goalsOf = (name: SideName): number =>
					moments.filter((moment) => moment.side === name && moment.outcome === 'goal').length;

				expect(score).toEqual({ home: goalsOf('home'), away: goalsOf('away') });
			})
		);
	});

	it('always has eight moments in minute order', () => {
		fc.assert(
			fc.property(side, side, seed, (home, away, chosen) => {
				const minutes = playMatch(home, away, createRandom(chosen)).moments.map(
					(moment) => moment.minute
				);

				expect(minutes).toEqual([7, 18, 29, 41, 53, 64, 76, 88]);
			})
		);
	});

	it('gives the same match for the same seed', () => {
		fc.assert(
			fc.property(side, side, seed, (home, away, chosen) => {
				expect(playMatch(home, away, createRandom(chosen))).toEqual(
					playMatch(home, away, createRandom(chosen))
				);
			})
		);
	});
});
