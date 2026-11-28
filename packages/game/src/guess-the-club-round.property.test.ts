import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createPlayerState } from './index.ts';
import { answerGuess, finishGuessRound, openGuessRound } from './guess-the-club-round.ts';

const OPTIONS = ['red', 'green', 'blue', 'gold'];
const question = (n: number) => ({
	playerId: `p${String(n)}`,
	hiddenClub: 'red',
	hiddenSpells: [0],
	options: OPTIONS
});

const action = fc.oneof(
	fc.record({
		kind: fc.constant('answer' as const),
		index: fc.integer({ min: -1, max: 5 }),
		club: fc.constantFrom(...OPTIONS, 'purple')
	}),
	fc.record({ kind: fc.constant('finish' as const) })
);

describe('paying a Guess the Club round', () => {
	it('never pays more than its questions plus the finish, however actions repeat', () => {
		fc.assert(
			fc.property(
				fc.array(action, { maxLength: 40 }),
				fc.integer({ min: 1, max: 5 }),
				(actions, count) => {
					let paid = openGuessRound({
						questions: Array.from({ length: count }, (_, i) => question(i))
					});
					let state = createPlayerState();
					const start = state.coins;
					for (const next of actions) {
						const result =
							next.kind === 'finish'
								? finishGuessRound(paid, state)
								: answerGuess(paid, state, next.index, next.club);
						if (result.ok) {
							paid = result.value.paid;
							state = result.value.state;
						}
						expect(state.coins).toBeGreaterThanOrEqual(start);
					}
					expect(state.coins - start).toBeLessThanOrEqual(count + 2);
				}
			)
		);
	});
});
