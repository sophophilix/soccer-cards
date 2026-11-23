import { describe, expect, it } from 'vitest';
import { CONNECTIONS_QUESTIONS, createRandom, startConnectionsRound } from './index.ts';
import type { Career, ConnectionsQuestion } from './index.ts';

const SEED = 20261123;

const aCareer = (playerId: string, clubs: readonly string[]): Career => ({
	playerId,
	spells: clubs.map((clubId, index) => ({ clubId, startYear: 2000 + index * 3 }))
});
const questionsFor = (careers: readonly Career[], seed = SEED): ConnectionsQuestion[] => {
	const result = startConnectionsRound(careers, createRandom(seed));
	return result.ok ? [...result.value.questions] : [];
};
const filler = [aCareer('x1', ['c1', 'c2']), aCareer('x2', ['c3', 'c4'])];

describe('startConnectionsRound', () => {
	it('refuses when no two players share a club', () => {
		const result = startConnectionsRound(
			[aCareer('a', ['red']), aCareer('b', ['blue']), aCareer('c', ['gold'])],
			createRandom(SEED)
		);

		expect(result).toEqual({ ok: false, reason: 'no-pairs' });
	});

	it('refuses an empty list of careers', () => {
		expect(startConnectionsRound([], createRandom(SEED))).toEqual({
			ok: false,
			reason: 'no-pairs'
		});
	});

	it('holds the two players, the answer and four different options', () => {
		const careers = [aCareer('a', ['red', 'blue']), aCareer('b', ['red', 'green']), ...filler];

		const [question] = questionsFor(careers);

		expect(question?.playerIds).toEqual(['a', 'b']);
		expect(question?.answer).toBe('red');
		expect(question?.options).toHaveLength(4);
		expect(new Set(question?.options).size).toBe(4);
		expect(question?.options).toContain('red');
	});

	it('never offers a shared club other than the answer', () => {
		const careers = [
			aCareer('a', ['red', 'blue', 'p']),
			aCareer('b', ['red', 'blue', 'q']),
			...filler
		];

		for (let seed = 0; seed < 30; seed++) {
			const [question] = questionsFor(careers, seed);
			const shared = question?.options.filter((club) => club === 'red' || club === 'blue');
			expect(shared).toEqual([question?.answer]);
		}
	});

	it('picks wrong options from the two careers before other clubs', () => {
		const careers = [
			aCareer('a', ['red', 'n1', 'n2']),
			aCareer('b', ['red', 'n3']),
			aCareer('far', ['f1', 'f2'])
		];

		const [question] = questionsFor(careers);

		expect([...(question?.options ?? [])].sort()).toEqual(['n1', 'n2', 'n3', 'red']);
	});

	it('fills with other clubs when the two careers have fewer than three', () => {
		const careers = [
			aCareer('a', ['red', 'n1']),
			aCareer('b', ['red', 'n2']),
			aCareer('far', ['f1', 'f2'])
		];

		const [question] = questionsFor(careers);
		const wrong = question?.options.filter((club) => club !== 'red') ?? [];

		expect(wrong).toContain('n1');
		expect(wrong).toContain('n2');
		expect(wrong).toHaveLength(3);
		expect(wrong.filter((club) => club.startsWith('f'))).toHaveLength(1);
	});

	it('does not ask a pair when fewer than three wrong clubs exist', () => {
		const result = startConnectionsRound(
			[aCareer('a', ['red', 'n1']), aCareer('b', ['red', 'n2'])],
			createRandom(SEED)
		);

		expect(result).toEqual({ ok: false, reason: 'no-pairs' });
	});

	it('drops every career whose player id appears twice', () => {
		const careers = [
			aCareer('a', ['red', 'n1']),
			aCareer('a', ['red', 'n2']),
			aCareer('b', ['red', 'n3', 'n4']),
			...filler
		];

		const ids = questionsFor(careers).flatMap((question) => question.playerIds);

		expect(ids).not.toContain('a');
	});

	it('asks 5 different pairs when more share a club', () => {
		const careers = Array.from({ length: 6 }, (_, index) =>
			aCareer(`p${String(index)}`, ['red', `own${String(index)}`, 'z'])
		);

		const questions = questionsFor(careers);
		const pairs = questions.map((question) => [...question.playerIds].sort().join('+'));

		expect(questions).toHaveLength(CONNECTIONS_QUESTIONS);
		expect(new Set(pairs).size).toBe(5);
	});

	it('asks as many questions as there are sharing pairs when fewer than 5', () => {
		const careers = [
			aCareer('a', ['red', 'n1']),
			aCareer('b', ['red', 'n2']),
			aCareer('c', ['n3', 'n4'])
		];

		expect(questionsFor(careers)).toHaveLength(1);
	});

	it('lets one player appear in two pairs', () => {
		const careers = [
			aCareer('a', ['red', 'blue', 'n1']),
			aCareer('b', ['red', 'n2']),
			aCareer('c', ['blue', 'n3'])
		];

		const ids = questionsFor(careers).flatMap((question) => question.playerIds);

		expect(ids.filter((id) => id === 'a')).toHaveLength(2);
	});

	it('gives the same round for the same seed', () => {
		const careers = [
			aCareer('a', ['red', 'n1', 'n2']),
			aCareer('b', ['red', 'n3']),
			aCareer('c', ['red', 'n4'])
		];

		expect(questionsFor(careers, 7)).toEqual(questionsFor(careers, 7));
	});
});
