import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ballChance, scoringChance } from './index.ts';

// From 0, so a line worth nothing is tried too.
const worth = fc.double({ min: 0, max: 150, noNaN: true });
const strength = fc.record({ attack: worth, midfield: worth, defence: worth, goalkeeper: worth });

describe('match chance properties', () => {
	it('never lowers the scoring probability for a stronger attack', () => {
		fc.assert(
			fc.property(strength, strength, worth, (attacking, defending, more) => {
				const stronger = { ...attacking, attack: attacking.attack + more };

				expect(scoringChance(stronger, defending)).toBeGreaterThanOrEqual(
					scoringChance(attacking, defending)
				);
			})
		);
	});

	it('keeps both chances from 0 to 1', () => {
		fc.assert(
			fc.property(strength, strength, (side, opponent) => {
				const chances = [ballChance(side, opponent), scoringChance(side, opponent)];

				expect(chances.filter((chance) => chance >= 0 && chance <= 1)).toHaveLength(2);
			})
		);
	});
});
