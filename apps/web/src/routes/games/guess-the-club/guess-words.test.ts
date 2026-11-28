import { expect, test } from 'vitest';
import { markText, questionText, rightText, spellFacts, wrongText } from './guess-words.ts';

test('a spell shows years, games and goals', () => {
	expect(spellFacts({ startYear: 2008, endYear: 2012, games: 30, goals: 1 })).toBe(
		'2008 to 2012, 30 games, 1 goal'
	);
	expect(spellFacts({ startYear: 2019, games: 1, goals: 0 })).toBe('2019 to now, 1 game, 0 goals');
});

test('a spell with games but no goals says goals are not known', () => {
	expect(spellFacts({ startYear: 2010, endYear: 2010, games: 4 })).toBe(
		'2010, 4 games, goals not known'
	);
	expect(spellFacts({ startYear: 2001, endYear: 2003 })).toBe('2001 to 2003, games not known');
});

test('the results name the hidden club and keep one full stop', () => {
	expect(rightText('Alpha FC')).toBe('Right! The hidden club was Alpha FC.');
	expect(rightText('Chelsea F.C.')).toBe('Right! The hidden club was Chelsea F.C.');
	expect(wrongText('Alpha FC')).toBe('Not this one. The hidden club was Alpha FC.');
});

test('the question names the player and the marks are words', () => {
	expect(questionText('Ana Diaz')).toBe('Which club is hidden in Ana Diaz’s career?');
	expect(markText(true)).toBe('right');
	expect(markText(false)).toBe('not this one');
});
