import { expect, test } from 'vitest';
import { cardName, pairsText, statusText, turnsText } from './pairs-words.ts';

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
