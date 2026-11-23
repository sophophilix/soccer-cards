import { expect, test } from 'vitest';
import {
	endSentence,
	finishText,
	markText,
	questionText,
	rightText,
	wrongText,
	yearsLine
} from './connections-words.ts';

test('a club name ending in a full stop does not get a second one', () => {
	expect(endSentence('Chelsea F.C.')).toBe('Chelsea F.C.');
	expect(rightText('Chelsea F.C.')).toBe('Right! Both played for Chelsea F.C.');
	expect(rightText('Alpha FC')).toBe('Right! Both played for Alpha FC.');
	expect(wrongText('Chelsea F.C.')).toBe(
		'Not this one. Both played for Chelsea F.C. Their years are below.'
	);
});

test('a wrong answer names the right club and points to the years', () => {
	expect(wrongText('Alpha FC')).toBe(
		'Not this one. Both played for Alpha FC. Their years are below.'
	);
});

test('the question names both players and the marks are words', () => {
	expect(markText(true)).toBe('right');
	expect(markText(false)).toBe('not this one');
	expect(questionText('Ana Diaz', 'Bo Lee')).toBe(
		'Name a club that Ana Diaz and Bo Lee both played for.'
	);
});

test('the years line shows a closed and an open spell', () => {
	expect(yearsLine('Ana Diaz', 'Alpha FC', { startYear: 2008, endYear: 2012 })).toBe(
		'Ana Diaz at Alpha FC: 2008 to 2012'
	);
	expect(yearsLine('Bo Lee', 'Alpha FC', { startYear: 2019 })).toBe(
		'Bo Lee at Alpha FC: 2019 to now'
	);
});

test('the finish says what was earned, from the economy table', () => {
	expect(finishText(5, 5)).toBe(
		'You got 5 answers right out of 5. You earned 7 coins: 5 coins for the answers and 2 for finishing.'
	);
});
