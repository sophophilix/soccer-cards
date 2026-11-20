import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CORNERS, createRandom, startShootOut, takeKick } from './index.ts';
import type { ShootOut } from './index.ts';

const keeper = fc.integer({ min: 1, max: 120 });
const shootOut = fc
	.record({ player: keeper, opponent: keeper })
	.map((goalkeepers) => startShootOut(goalkeepers));
// Enough kicks that most shoot-outs finish. The kicks after the end are refused.
const corners = fc.array(fc.constantFrom(...CORNERS), { minLength: 1, maxLength: 40 });
const seed = fc.integer();

// Takes each kick in order and stops at the first refusal.
const play = (from: ShootOut, chosen: readonly string[], seedNumber: number): ShootOut[] => {
	const random = createRandom(seedNumber);
	return chosen.reduce<ShootOut[]>(
		(steps, corner) => {
			const result = takeKick(steps[steps.length - 1] ?? from, corner, random);
			return result.ok ? [...steps, result.value] : steps;
		},
		[from]
	);
};

describe('shoot-out properties', () => {
	it('never finishes with equal scores', () => {
		fc.assert(
			fc.property(shootOut, corners, seed, (start, chosen, chosenSeed) => {
				const finished = play(start, chosen, chosenSeed).filter(
					(step) => step.status.kind === 'over'
				);

				expect(finished.filter((step) => step.score.player === step.score.opponent)).toEqual([]);
			})
		);
	});

	it('never lets one side take two kicks more than the other', () => {
		fc.assert(
			fc.property(shootOut, corners, seed, (start, chosen, chosenSeed) => {
				const gaps = play(start, chosen, chosenSeed).map((step) =>
					Math.abs(
						step.kicks.filter((kick) => kick.kicker === 'player').length -
							step.kicks.filter((kick) => kick.kicker === 'opponent').length
					)
				);

				expect(Math.max(...gaps)).toBeLessThanOrEqual(1);
			})
		);
	});

	it('gives the same shoot-out for the same seed and the same corners', () => {
		fc.assert(
			fc.property(shootOut, corners, seed, (start, chosen, chosenSeed) => {
				expect(play(start, chosen, chosenSeed)).toEqual(play(start, chosen, chosenSeed));
			})
		);
	});
});
