import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TRAIL_FINISH_COINS, TRAIL_RIGHT_COINS, createPlayerState } from './index.ts';
import { checkTrailInRound, finishTrailRound, openPaidRound } from './transfer-trail-round.ts';

const CLUBS = ['red', 'green', 'blue'];
const steps = Array.from({ length: 5 }, (_, i) => ({
	playerId: `p${String(i)}`,
	spells: CLUBS.map((clubId, n) => ({ clubId, startYear: 2000 + n })),
	dealt: [...CLUBS].reverse()
}));

const action = fc.oneof(
	fc.record({
		kind: fc.constant('check' as const),
		player: fc.integer({ min: 0, max: 5 }),
		answer: fc.shuffledSubarray(CLUBS, { minLength: 3, maxLength: 3 })
	}),
	fc.record({ kind: fc.constant('finish' as const) })
);

describe('paying a Transfer Trail round', () => {
	it('never pays more than its trails plus the finish, however actions repeat', () => {
		fc.assert(
			fc.property(
				fc.array(action, { maxLength: 40 }),
				fc.integer({ min: 1, max: 5 }),
				(actions, count) => {
					let paid = openPaidRound({ steps: steps.slice(0, count) });
					let state = createPlayerState();
					const start = state.coins;
					for (const next of actions) {
						const result =
							next.kind === 'finish'
								? finishTrailRound(paid, state)
								: checkTrailInRound(paid, state, `p${String(next.player)}`, next.answer);
						if (result.ok) {
							paid = result.value.paid;
							state = result.value.state;
						}
						expect(state.coins).toBeGreaterThanOrEqual(start);
					}

					expect(state.coins - start).toBeLessThanOrEqual(
						count * TRAIL_RIGHT_COINS + TRAIL_FINISH_COINS
					);
				}
			)
		);
	});
});
