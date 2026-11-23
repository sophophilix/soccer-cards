import { expect, test } from 'vitest';
import { checkText, finishText, placeText, plural, yearsText } from './trail-words.ts';

test('a spell with no end year reads "to now"', () => {
	expect(yearsText(2019)).toBe('2019 to now');
});

test('a spell within one year shows that year, otherwise both', () => {
	expect(yearsText(2010, 2010)).toBe('2010');
	expect(yearsText(2010, 2014)).toBe('2010 to 2014');
});

test('a right place says so, and a wrong one says what was put there', () => {
	const spell = { startYear: 2010, endYear: 2014 };

	expect(placeText(spell, true, 'Beta')).toBe('2010 to 2014 (right place)');
	expect(placeText(spell, false, 'Beta')).toBe('2010 to 2014 (you put Beta here)');
});

test('the finish line counts trails and the finishing coins', () => {
	expect(finishText(1, 5)).toBe(
		'You put 1 trail right out of 5. You earned 3 coins: 1 coin for the trails and 2 for finishing.'
	);
});

test('the check line names the player', () => {
	expect(checkText(true, 'Ana Diaz')).toContain('You earned 1 coin.');
	expect(checkText(false, 'Ana Diaz')).toContain('real trail');
	expect(plural(0, 'coin')).toBe('0 coins');
});
