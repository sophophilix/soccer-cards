import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CONNECTIONS_QUESTIONS, createRandom, startConnectionsRound } from './index.ts';
import type { Career } from './index.ts';

const seed = fc.integer();
const careers = fc.array(
	fc.record({
		playerId: fc.string({ minLength: 1, maxLength: 3 }),
		spells: fc.array(
			fc.record({
				clubId: fc.constantFrom('red', 'green', 'blue', 'gold', 'pink', 'grey', 'teal'),
				startYear: fc.integer({ min: 1990, max: 2030 })
			}),
			{ maxLength: 5 }
		)
	}),
	{ maxLength: 10 }
);

const clubsOf = (list: readonly Career[], playerId: string): Set<string> =>
	new Set(
		list
			.filter((item) => item.playerId === playerId)
			.flatMap((item) => item.spells.map((spell) => spell.clubId))
	);

describe('startConnectionsRound properties', () => {
	it('deals four different options with exactly one shared club, and never repeats a pair', () => {
		fc.assert(
			fc.property(careers, seed, (list: Career[], roundSeed) => {
				const result = startConnectionsRound(list, createRandom(roundSeed));
				const questions = result.ok ? result.value.questions : [];

				expect(questions.length).toBeLessThanOrEqual(CONNECTIONS_QUESTIONS);
				const pairs = questions.map((question) => [...question.playerIds].sort().join('|'));
				expect(new Set(pairs).size).toBe(pairs.length);
				for (const question of questions) {
					const [first, second] = question.playerIds;
					const firstClubs = clubsOf(list, first);
					const secondClubs = clubsOf(list, second);
					const shared = question.options.filter(
						(club) => firstClubs.has(club) && secondClubs.has(club)
					);
					expect(new Set(question.options).size).toBe(4);
					expect(shared).toEqual([question.answer]);
				}
			})
		);
	});
});
