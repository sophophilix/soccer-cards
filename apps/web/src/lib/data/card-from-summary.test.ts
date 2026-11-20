import { toCardId } from '@soccer-cards/game';
import { describe, expect, it } from 'vitest';
import goalkeeper from '../../../../../packages/schema/schemas/v1/examples/player.goalkeeper.json';
import outfield from '../../../../../packages/schema/schemas/v1/examples/player.outfield.json';
import { cardFromSummary } from './card-from-summary.ts';

const PLAY_STATS = { attack: 58, defence: 52, control: 68, overall: 61 };

/** Builds an invented player summary for a test. Pass only the fields the test cares about. */
function aSummary(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		name: 'players/pip-alder',
		displayName: 'Pip Alder',
		state: 'ACTIVE',
		nationalTeamCode: 'WAL',
		position: 'MIDFIELDER',
		tier: 'BASE',
		playStats: PLAY_STATS,
		...overrides
	};
}

describe('cardFromSummary', () => {
	it('turns the outfield example into a rare forward', () => {
		expect(cardFromSummary(outfield)).toEqual({
			id: toCardId('tavi-brightwell'),
			tier: 'rare',
			position: 'FW',
			overall: 84,
			attack: 86,
			defence: 45,
			control: 79
		});
	});

	it('turns the goalkeeper example into an icon in goal', () => {
		expect(cardFromSummary(goalkeeper)).toMatchObject({
			id: toCardId('juno-marshwick'),
			tier: 'icon',
			position: 'GK',
			overall: 88
		});
	});

	it.each([
		['BASE', 'GOALKEEPER', 'base', 'GK'],
		['RARE', 'DEFENDER', 'rare', 'DF'],
		['LEGEND', 'MIDFIELDER', 'legend', 'MF'],
		['ICON', 'FORWARD', 'icon', 'FW']
	])('maps %s and %s to %s and %s', (tier, position, gameTier, gamePosition) => {
		const card = cardFromSummary(aSummary({ tier, position }));

		expect(card).toMatchObject({ tier: gameTier, position: gamePosition });
	});

	it('keeps a card whose state is a value it does not know', () => {
		expect(cardFromSummary(aSummary({ state: 'ON_LOAN' }))?.id).toBe(toCardId('pip-alder'));
	});

	it.each([1, 99])('keeps a card with the overall rating %j', (overall) => {
		const playStats = { ...PLAY_STATS, overall };

		expect(cardFromSummary(aSummary({ playStats }))?.overall).toBe(overall);
	});

	it.each([
		{ tier: 'MYTHIC' },
		{ tier: 'base' },
		{ tier: 'toString' },
		{ position: 'WINGER' },
		{ position: 'FW' },
		{ position: 'constructor' },
		{ name: 'clubs/pip-alder' },
		{ name: 'players/' },
		{ name: 'players/Pip' },
		{ displayName: '' },
		{ playStats: { ...PLAY_STATS, attack: 0 } },
		{ playStats: { ...PLAY_STATS, defence: 100 } },
		{ playStats: { ...PLAY_STATS, control: 61.5 } },
		{ playStats: { ...PLAY_STATS, overall: '61' } },
		{ playStats: [58, 52, 68, 61] }
	])('leaves out a summary with %j', (overrides) => {
		expect(cardFromSummary(aSummary(overrides))).toBeUndefined();
	});

	it.each(['name', 'displayName', 'state', 'nationalTeamCode', 'position', 'tier', 'playStats'])(
		'leaves out a summary missing the required field %s',
		(field) => {
			const summary = Object.fromEntries(
				Object.entries(aSummary()).filter(([key]) => key !== field)
			);

			expect(cardFromSummary(summary)).toBeUndefined();
		}
	);

	it.each([null, 'players/pip-alder', 7, []])('leaves out a summary that is %j', (summary) => {
		expect(cardFromSummary(summary)).toBeUndefined();
	});
});
