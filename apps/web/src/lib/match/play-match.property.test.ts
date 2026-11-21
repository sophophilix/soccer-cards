import { createRandom } from '@soccer-cards/game';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { aCardSet, aPlan, aState } from './match-fixtures.ts';
import { startMatch } from './play-match.ts';

describe('startMatch', () => {
	it('scores each side the count of its goal moments, for any seed', () => {
		fc.assert(
			fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
				const played = startMatch(aState(), aCardSet(), aPlan(), createRandom(seed));
				expect(played.ok).toBe(true);
				if (!played.ok) return;
				const { moments, score } = played.value.result;
				const goals = (side: 'home' | 'away'): number =>
					moments.filter((moment) => moment.side === side && moment.outcome === 'goal').length;
				expect(score).toEqual({ home: goals('home'), away: goals('away') });
			})
		);
	});
});
