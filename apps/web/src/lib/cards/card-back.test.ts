import { describe, expect, test } from 'vitest';
import { countryName, formatCardNumber, formatLicense } from './card-back.ts';

describe('countryName', () => {
	test.each([
		['ENG', 'England'],
		['NED', 'Netherlands'],
		['ARG', 'Argentina']
	])('names %s as %s', (code, name) => {
		expect(countryName(code)).toBe(name);
	});

	test('shows a code it does not know as the code', () => {
		expect(countryName('XYZ')).toBe('XYZ');
	});
});

describe('formatLicense', () => {
	test.each([
		['CC-BY-SA-4.0', 'CC BY-SA 4.0'],
		['CC-BY-2.0', 'CC BY 2.0'],
		['CC0-1.0', 'CC0-1.0']
	])('writes %s as %s', (code, text) => {
		expect(formatLicense(code)).toBe(text);
	});
});

test('a card number has three digits', () => {
	expect(formatCardNumber(17)).toBe('#017');
	expect(formatCardNumber(123)).toBe('#123');
});
