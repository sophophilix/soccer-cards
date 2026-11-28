import { describe, expect, it } from 'vitest';
import { GUESS_OPTIONS, GUESS_QUESTIONS, createRandom, startGuessRound } from './index.ts';
import type { Career, GuessQuestion } from './index.ts';

const SEED = 20261128;

const aCareer = (
	playerId: string,
	spells: readonly (readonly [string, number | undefined])[]
): Career => ({
	playerId,
	spells: spells.map(([clubId, games], index) => ({
		clubId,
		startYear: 2000 + index * 3,
		...(games === undefined ? {} : { games })
	}))
});
const questionsFor = (careers: readonly Career[], seed = SEED): GuessQuestion[] => {
	const result = startGuessRound(careers, createRandom(seed));
	return result.ok ? [...result.value.questions] : [];
};
const others = aCareer('o', [
	['c1', 5],
	['c2', 5],
	['c3', 5],
	['c4', 5]
]);
const hero = aCareer('a', [
	['red', 10],
	['blue', 90],
	['green', 20]
]);

describe('startGuessRound', () => {
	it('refuses when no player has three spells and a known games count', () => {
		const careers = [
			aCareer('a', [
				['red', 1],
				['blue', 2]
			]),
			aCareer('b', [
				['red', undefined],
				['blue', undefined],
				['green', undefined]
			])
		];

		expect(startGuessRound(careers, createRandom(SEED))).toEqual({
			ok: false,
			reason: 'no-players'
		});
		expect(startGuessRound([], createRandom(SEED))).toEqual({ ok: false, reason: 'no-players' });
	});

	it('hides the club of the spell with the most games', () => {
		const question = questionsFor([hero, others]).find((item) => item.playerId === 'a');

		expect(question?.hiddenClub).toBe('blue');
		expect(question?.hiddenSpells).toEqual([1]);
	});

	it('hides the earlier spell on a tie', () => {
		const tied = aCareer('t', [
			['red', 40],
			['blue', 40],
			['green', 1]
		]);

		expect(questionsFor([tied, others]).find((item) => item.playerId === 't')?.hiddenClub).toBe(
			'red'
		);
	});

	it('never hides a spell with no games count', () => {
		const partial = aCareer('p', [
			['red', undefined],
			['blue', 3],
			['green', undefined]
		]);

		expect(questionsFor([partial, others]).find((item) => item.playerId === 'p')?.hiddenClub).toBe(
			'blue'
		);
	});

	it('deals the hidden club and three clubs the player never played for', () => {
		const question = questionsFor([hero, others]).find((item) => item.playerId === 'a');

		const wrong = question?.options.filter((club) => club !== 'blue') ?? [];
		expect(question?.options).toHaveLength(GUESS_OPTIONS);
		expect(question?.options).toContain('blue');
		expect(wrong).toHaveLength(3);
		expect(wrong.every((club) => ['c1', 'c2', 'c3', 'c4'].includes(club))).toBe(true);
	});

	it('hides every spell at the hidden club', () => {
		const returner = aCareer('r', [
			['red', 30],
			['blue', 20],
			['red', 50]
		]);

		const question = questionsFor([returner, others]).find((item) => item.playerId === 'r');

		expect(question?.hiddenClub).toBe('red');
		expect(question?.hiddenSpells).toEqual([0, 2]);
	});

	it('does not ask a player when fewer than three other clubs exist', () => {
		const few = aCareer('f', [
			['red', 1],
			['blue', 2],
			['green', 3]
		]);
		const small = aCareer('s', [['c1', 1]]);

		expect(startGuessRound([few, small], createRandom(SEED))).toEqual({
			ok: false,
			reason: 'no-players'
		});
	});

	it('drops both careers that share a player id', () => {
		const twin = aCareer('a', [
			['red', 1],
			['blue', 2],
			['green', 3]
		]);

		expect(startGuessRound([hero, twin, others], createRandom(SEED))).toEqual({
			ok: false,
			reason: 'no-players'
		});
	});

	it('asks about at most five different players', () => {
		const many = Array.from({ length: 8 }, (_, index) =>
			aCareer(`p${String(index)}`, [
				['red', 1],
				['blue', 2],
				['green', 3]
			])
		);

		const questions = questionsFor([...many, others]);

		expect(questions).toHaveLength(GUESS_QUESTIONS);
		expect(new Set(questions.map((question) => question.playerId)).size).toBe(GUESS_QUESTIONS);
	});

	it('gives the same round for the same seed', () => {
		expect(questionsFor([hero, others], 7)).toEqual(questionsFor([hero, others], 7));
	});
});
