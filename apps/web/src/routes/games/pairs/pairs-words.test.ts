import { expect, test } from 'vitest';
import { cardName, finishText, pairsText, statusText, turnsText } from './pairs-words.ts';

test('the status line says what to do next, and what just happened', () => {
	expect(statusText({ kind: 'first' })).toBe('Turn a card.');
	expect(statusText({ kind: 'second' })).toBe('Now turn a second card.');
	expect(statusText({ kind: 'match', name: 'Ana Diaz' })).toBe('A match: Ana Diaz!');
	expect(statusText({ kind: 'miss' })).toBe('Not the same. Remember where they are.');
});

test('a card is named by its place while down, and by its player once up', () => {
	expect(cardName({ place: 3, state: 'down' })).toBe('Face-down card 3');
	expect(cardName({ place: 3, state: 'up', name: 'Ana Diaz' })).toBe('Ana Diaz');
	expect(cardName({ place: 3, state: 'matched', name: 'Ana Diaz' })).toBe('Ana Diaz, matched');
});

test('the counts read as words', () => {
	expect(turnsText(0)).toBe('Turns: 0');
	expect(turnsText(7)).toBe('Turns: 7');
	expect(pairsText(2, 6)).toBe('Pairs: 2 of 6');
});

test('the finish text adds the bonus for few turns', () => {
	expect(finishText(6, 12)).toBe(
		'You used 12 turns. You earned 4 coins: 3 for the board and 1 for finding them in 12 turns or fewer.'
	);
});

test('the finish text asks for fewer turns when there was no bonus', () => {
	expect(finishText(8, 17)).toBe(
		'You used 17 turns. You earned 4 coins: 4 for the board. Find them in 16 turns or fewer next time for 1 more.'
	);
	expect(finishText(10, 21)).toContain('You used 21 turns.');
});
