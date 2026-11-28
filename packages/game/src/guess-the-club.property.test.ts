import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { GUESS_OPTIONS, GUESS_QUESTIONS, createRandom, startGuessRound } from './index.ts';
import type { Career } from './index.ts';

const spell = fc.record(
	{
		clubId: fc.constantFrom('red', 'green', 'blue', 'gold', 'pink', 'grey', 'teal'),
		startYear: fc.integer({ min: 1990, max: 2030 }),
		games: fc.integer({ min: 0, max: 60 })
	},
	{ requiredKeys: ['clubId', 'startYear'] }
);
const careers = fc.array(
	fc.record({
		playerId: fc.string({ minLength: 1, maxLength: 3 }),
		spells: fc.array(spell, { maxLength: 5 })
	}),
	{ maxLength: 10 }
);

describe('startGuessRound properties', () => {
	it('deals four distinct options with one played club, hiding the club with most games', () => {
		fc.assert(
			fc.property(careers, fc.integer(), (list: Career[], seed) => {
				const result = startGuessRound(list, createRandom(seed));
				const questions = result.ok ? result.value.questions : [];

				expect(questions.length).toBeLessThanOrEqual(GUESS_QUESTIONS);
				expect(new Set(questions.map((question) => question.playerId)).size).toBe(questions.length);
				for (const question of questions) {
					const spells = list.find((item) => item.playerId === question.playerId)?.spells ?? [];
					const played = new Set(spells.map((item) => item.clubId));
					expect(question.options).toHaveLength(GUESS_OPTIONS);
					expect(new Set(question.options).size).toBe(GUESS_OPTIONS);
					expect(question.options.filter((club) => played.has(club))).toEqual([
						question.hiddenClub
					]);
					const most = Math.max(...spells.map((item) => item.games ?? -1));
					const hidden = spells.filter((item) => item.clubId === question.hiddenClub);
					expect(hidden.some((item) => item.games === most)).toBe(true);
					expect(question.hiddenSpells).toHaveLength(hidden.length);
				}
			})
		);
	});
});
