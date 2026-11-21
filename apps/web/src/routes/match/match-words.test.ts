import { TACTICS, TACTIC_IDS } from '@soccer-cards/game';
import { describe, expect, it } from 'vitest';
import { TACTIC_WORDS, lineUpHint, tacticHint } from './match-words.ts';

describe('tacticHint', () => {
	it.each(TACTIC_IDS)('for %s names the tactic it beats and the one it loses to', (tactic) => {
		const beaten = TACTICS[tactic].beats;
		const beater = TACTIC_IDS.find((each) => TACTICS[each].beats === tactic);

		const hint = tacticHint(tactic);

		expect(beater).toBeDefined();
		expect(hint).toContain(`Beats ${TACTIC_WORDS[beaten].name}.`);
		expect(hint).toContain(`Loses to ${TACTIC_WORDS[beater ?? tactic].name}.`);
	});

	it('gives the exact words for each tactic', () => {
		expect(TACTIC_IDS.map(tacticHint)).toEqual([
			'More shots, but a thin defence. Beats Park the bus. Loses to Counter-attack.',
			'Sit back, then break fast into the space. Beats All-out attack. Loses to Keep the ball.',
			'Win the midfield so they never get the ball. Beats Counter-attack. Loses to Park the bus.',
			'Everyone behind the ball. Hard to score against. Beats Keep the ball. Loses to All-out attack.'
		]);
	});
});

describe('lineUpHint', () => {
	it('says everyone is in position for none out of position, as an empty team has', () => {
		expect(lineUpHint(0)).toBe('Everyone is in their own position.');
	});

	it('says "1 player is" for one out of position', () => {
		expect(lineUpHint(1)).toBe(
			'1 player is out of position (dashed outline) and plays worse there. Try another formation.'
		);
	});

	it('says "players are" with the count for two or more', () => {
		expect(lineUpHint(2)).toContain('2 players are out of position');
		expect(lineUpHint(5)).toContain('5 players are out of position');
	});
});
